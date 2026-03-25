import OpenAI from "openai";
import type { ReservedSql } from "postgres";
import type {
    EventRefreshInterval,
    EventUrlSetting,
} from "@/types/typesSettings";
import sql from "@/utils/db";
import { getUserSettings } from "@/utils/serverAuth";

const CUSTOM_SOURCE_KIND = "url";
const inFlightCustomRefreshes = new Map<string, Promise<void>>();

type DbConnection = typeof sql | ReservedSql<Record<string, never>>;

type RefreshStateRow = {
    cache_key: string | null;
    next_refresh_at: string | null;
};

type CustomEventRow = {
    title: string;
    date: string;
    address: string | null;
    link: string | null;
    description: string | null;
    image: string | null;
};

function buildSourceKey(url: string) {
    return `url:${url.trim()}`;
}

function buildCacheKey(source: EventUrlSetting) {
    return JSON.stringify({
        url: source.url.trim(),
        refreshInterval: source.refreshInterval,
    });
}

function getLookaheadDays(interval: EventRefreshInterval) {
    switch (interval) {
        case "weekly":
            return 7;
        case "monthly":
            return 30;
        default:
            return 1;
    }
}

function addInterval(date: Date, interval: EventRefreshInterval) {
    const next = new Date(date);

    switch (interval) {
        case "weekly":
            next.setDate(next.getDate() + 7);
            break;
        case "monthly":
            next.setMonth(next.getMonth() + 1);
            break;
        default:
            next.setDate(next.getDate() + 1);
            break;
    }

    return next;
}

function getDateRange(interval: EventRefreshInterval) {
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + getLookaheadDays(interval) - 1);

    return {
        todayStr: today.toISOString().slice(0, 10),
        endStr: endDate.toISOString().slice(0, 10),
    };
}

function formatDate(date: string) {
    if (!date) return "";

    try {
        const obj = JSON.parse(date);
        if (obj.when) return obj.when;
        if (obj.start_date) return obj.start_date;
    } catch {
        const parsed = new Date(date);
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toLocaleDateString("de-DE", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        }

        return date;
    }

    return date;
}

function normalizeDate(dateValue: string | null | undefined, fallbackDay: string) {
    if (!dateValue) return fallbackDay;

    const trimmed = String(dateValue).trim();
    const isoMatch = trimmed.match(/\d{4}-\d{2}-\d{2}/);
    if (isoMatch) return isoMatch[0];

    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString().slice(0, 10);
    }

    return fallbackDay;
}

function parseCsvLine(line: string) {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i += 1;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }

        if (char === ";" && !inQuotes) {
            values.push(current.trim());
            current = "";
            continue;
        }

        current += char;
    }

    values.push(current.trim());
    return values;
}

function parseCsvEvents(csv: string, sourceUrl: string, fallbackDay: string): CustomEventRow[] {
    const lines = csv
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

    const events: CustomEventRow[] = [];

    for (const line of lines) {
        const [
            title = "",
            date = "",
            address = "",
            link = "",
            description = "",
        ] = parseCsvLine(line);

        if (!title) continue;
        if (title.toLowerCase() === "kein event gefunden") continue;

        events.push({
            title,
            date: normalizeDate(date, fallbackDay),
            address: address && address !== "-" ? address : null,
            link: link && link !== "-" ? link : sourceUrl,
            description: description && description !== "-" ? description : null,
            image: null,
        });
    }

    return events;
}

function dedupeEvents(events: CustomEventRow[]) {
    const seen = new Set<string>();
    const unique: CustomEventRow[] = [];

    for (const event of events) {
        const key = [
            event.title.trim().toLowerCase(),
            event.date,
            event.link?.trim().toLowerCase() ?? "",
            event.address?.trim().toLowerCase() ?? "",
        ].join("::");

        if (seen.has(key)) {
            continue;
        }

        seen.add(key);
        unique.push(event);
    }

    return unique;
}

async function fetchOpenAiEventsForSource(
    sourceUrl: string,
    interval: EventRefreshInterval,
    openAiKey: string
) {
    const { todayStr, endStr } = getDateRange(interval);

    console.log("[event-url] OpenAI fetch start:", {
        sourceUrl,
        interval,
        todayStr,
        endStr,
    });

    const client = new OpenAI({ apiKey: openAiKey });

    const response = await client.responses.create({
        model: "gpt-5-mini",
        tools: [
            {
                type: "web_search",
                search_context_size: "medium",
            },
        ],
        input: [
            {
                role: "system",
                content: `
Du bist ein Assistent zum Extrahieren von Eventdaten aus Webseiten.

Regeln:
- Stelle keine Rueckfragen.
- Beginne sofort mit der Extraktion.
- Extrahiere nur Events im Zeitraum ${todayStr} bis ${endStr}.
- Wenn mehr Monate auf der Seite existieren, ignoriere sie.
- Navigiere nicht unnoetig zu sehr alten oder weit zukuenftigen Terminen.
- Arbeite effizient und vermeide unnoetige Seitenabfragen.
        `.trim(),
            },
            {
                role: "user",
                content: `
Besuche die Webseite ${sourceUrl} und extrahiere Events.

Filter:
- Nur Events zwischen ${todayStr} und ${endStr}

Gib die Daten als CSV ohne Header aus mit exakt diesen Spalten:
title;date;address;link;description

Vorgaben:
- Trennzeichen: Semikolon (;)
- link: immer ${sourceUrl}
- date: Format yyyy-mm-dd
- description: nur Klartext aus der Eventbeschreibung
- keine HTML-Tags
- keine Referenzen oder Quellen
- keine zusaetzlichen Erklaerungen
- keine Rueckfragen
- nur reine CSV

Wenn keine Events im Zeitraum vorhanden sind, erstelle genau diese Zeile:
Kein Event gefunden;-;-;${sourceUrl};Keine Termine zwischen ${todayStr} und ${endStr}
        `.trim(),
            },
        ],
    });

    const csv = response.output_text ?? "";

    console.log("[event-url] OpenAI raw response:", {
        sourceUrl,
        interval,
        todayStr,
        endStr,
        csvLength: csv.length,
        preview: csv.slice(0, 300),
    });

    const events = parseCsvEvents(csv, sourceUrl, todayStr);

    console.log("[event-url] parsed events:", {
        sourceUrl,
        count: events.length,
        titles: events.map((event) => event.title),
    });

    return dedupeEvents(events);
}


async function deleteOldEventsForSource(userId: string, sourceUrl: string) {
    const todayString = new Date().toISOString().slice(0, 10);

    await sql`
    DELETE FROM events
    WHERE user_id = ${userId}::uuid
      AND domain = ${sourceUrl}
      AND date < ${todayString}
  `;
}

async function insertCustomEventsForUser(
    userId: string,
    sourceUrl: string,
    sourceTown: string | null,
    events: CustomEventRow[]
) {
    const inserted: Array<{ title: string; date: string }> = [];

    for (const event of events) {
        const isoDate = normalizeDate(event.date, new Date().toISOString().slice(0, 10));
        const addressJson = event.address ? JSON.stringify(event.address) : null;

        let description = event.description || "";
        if (event.date) {
            description += `\n[Original date: ${formatDate(event.date)}]`;
        }

        const result = await sql<{ title: string; date: string }[]>`
      INSERT INTO events (
        user_id,
        title,
        date,
        address,
        link,
        description,
        image,
        domain,
        source_town
      )
      SELECT
        ${userId}::uuid,
        ${event.title},
        ${isoDate},
        ${addressJson},
        ${event.link},
        ${description || null},
        ${event.image},
        ${sourceUrl},
        ${sourceTown}
      WHERE NOT EXISTS (
        SELECT 1
        FROM events
        WHERE user_id = ${userId}::uuid
          AND title = ${event.title}
          AND date = ${isoDate}
          AND COALESCE(link, '') = COALESCE(${event.link}, '')
          AND COALESCE(address::text, '') = COALESCE(${addressJson}, '')
          AND COALESCE(domain, '') = COALESCE(${sourceUrl}, '')
          AND COALESCE(source_town, '') = COALESCE(${sourceTown}, '')
      )
      RETURNING title, date
    `;

        if (result.length > 0) {
            inserted.push(result[0]);
        }
    }

    console.log("[event-url] insert result:", {
        userId,
        sourceUrl,
        attempted: events.length,
        inserted: inserted.length,
        titles: inserted.map((entry) => `${entry.date} | ${entry.title}`),
    });

    return inserted.length;
}

async function readUrlRefreshState(userId: string, sourceKey: string) {
    const [row] = await sql<RefreshStateRow[]>`
    SELECT cache_key, next_refresh_at
    FROM user_event_refresh_state
    WHERE user_id = ${userId}::uuid
      AND source_key = ${sourceKey}
    LIMIT 1
  `;

    return row ?? null;
}

async function tryAcquireLock(db: DbConnection, lockKey: string) {
    const [row] = await db<{ locked: boolean }[]>`
    SELECT pg_try_advisory_lock(hashtext(${lockKey})) AS locked
  `;

    return row?.locked ?? false;
}

async function releaseLock(db: DbConnection, lockKey: string) {
    await db`
    SELECT pg_advisory_unlock(hashtext(${lockKey}))
  `;
}

async function markUrlRefreshRunning(userId: string, sourceKey: string, cacheKey: string) {
    await sql`
    INSERT INTO user_event_refresh_state (
      user_id,
      source_key,
      source_kind,
      cache_key,
      refresh_started_at,
      last_status,
      last_error
    )
    VALUES (
      ${userId}::uuid,
      ${sourceKey},
      ${CUSTOM_SOURCE_KIND},
      ${cacheKey},
      NOW(),
      'running',
      NULL
    )
    ON CONFLICT (user_id, source_key)
    DO UPDATE SET
      source_kind = EXCLUDED.source_kind,
      cache_key = EXCLUDED.cache_key,
      refresh_started_at = EXCLUDED.refresh_started_at,
      last_status = EXCLUDED.last_status,
      last_error = NULL
  `;
}

async function markUrlRefreshSuccess(
    userId: string,
    sourceKey: string,
    cacheKey: string,
    nextRefreshAt: Date
) {
    await sql`
    INSERT INTO user_event_refresh_state (
      user_id,
      source_key,
      source_kind,
      cache_key,
      last_refreshed_at,
      next_refresh_at,
      refresh_started_at,
      last_status,
      last_error
    )
    VALUES (
      ${userId}::uuid,
      ${sourceKey},
      ${CUSTOM_SOURCE_KIND},
      ${cacheKey},
      NOW(),
      ${nextRefreshAt.toISOString()}::timestamptz,
      NULL,
      'success',
      NULL
    )
    ON CONFLICT (user_id, source_key)
    DO UPDATE SET
      source_kind = EXCLUDED.source_kind,
      cache_key = EXCLUDED.cache_key,
      last_refreshed_at = EXCLUDED.last_refreshed_at,
      next_refresh_at = EXCLUDED.next_refresh_at,
      refresh_started_at = NULL,
      last_status = EXCLUDED.last_status,
      last_error = NULL
  `;
}

async function markUrlRefreshError(
    userId: string,
    sourceKey: string,
    cacheKey: string,
    error: unknown
) {
    const message =
        error instanceof Error ? error.message : "Unbekannter URL-Refresh-Fehler";

    await sql`
    INSERT INTO user_event_refresh_state (
      user_id,
      source_key,
      source_kind,
      cache_key,
      refresh_started_at,
      last_status,
      last_error
    )
    VALUES (
      ${userId}::uuid,
      ${sourceKey},
      ${CUSTOM_SOURCE_KIND},
      ${cacheKey},
      NULL,
      'error',
      ${message}
    )
    ON CONFLICT (user_id, source_key)
    DO UPDATE SET
      source_kind = EXCLUDED.source_kind,
      cache_key = EXCLUDED.cache_key,
      refresh_started_at = NULL,
      last_status = EXCLUDED.last_status,
      last_error = EXCLUDED.last_error
  `;
}

function runSingleFlight(key: string, work: () => Promise<void>) {
    const existing = inFlightCustomRefreshes.get(key);
    if (existing) {
        return existing;
    }

    const promise = work().finally(() => {
        inFlightCustomRefreshes.delete(key);
    });

    inFlightCustomRefreshes.set(key, promise);
    return promise;
}

async function refreshSingleCustomEventSource(
    userId: string,
    source: EventUrlSetting,
    sourceTown: string | null,
    openAiKey: string,
    force = false
) {
    const sourceUrl = source.url.trim();

    if (!sourceUrl) {
        return;
    }

    const sourceKey = buildSourceKey(sourceUrl);
    const cacheKey = buildCacheKey(source);
    const lockKey = `events:${userId}:${sourceKey}`;

    if (!force) {
        const state = await readUrlRefreshState(userId, sourceKey);
        const nextRefreshDue =
            !state?.next_refresh_at ||
            new Date(state.next_refresh_at).getTime() <= Date.now();
        const cacheKeyChanged = state?.cache_key !== cacheKey;

        if (!nextRefreshDue && !cacheKeyChanged) {
            return;
        }
    }

    const lockConnection = await sql.reserve();
    const locked = await tryAcquireLock(lockConnection, lockKey);

    if (!locked) {
        lockConnection.release();
        return;
    }

    try {
        await markUrlRefreshRunning(userId, sourceKey, cacheKey);

        await deleteOldEventsForSource(userId, sourceUrl);

        const events = await fetchOpenAiEventsForSource(
            sourceUrl,
            source.refreshInterval,
            openAiKey
        );

        await insertCustomEventsForUser(userId, sourceUrl, sourceTown, events);

        await markUrlRefreshSuccess(
            userId,
            sourceKey,
            cacheKey,
            addInterval(new Date(), source.refreshInterval)
        );
    } catch (error) {
        await markUrlRefreshError(userId, sourceKey, cacheKey, error);
        throw error;
    } finally {
        try {
            await releaseLock(lockConnection, lockKey);
        } finally {
            lockConnection.release();
        }
    }
}

export async function refreshCustomEventSourcesForUser(
    userId: string,
    options?: { force?: boolean }
) {
    const settings = await getUserSettings(userId);
    const openAiKey = settings.key2?.trim();

    console.log("[event-url] refreshCustomEventSourcesForUser called:", {
        userId,
        sourceCount: settings.event_urls.length,
        sources: settings.event_urls,
        hasOpenAiKey: Boolean(openAiKey),
        force: options?.force ?? false,
    });

    if (!openAiKey) {
        console.log("[event-url] skipped because OPENAI_API_KEY is missing:", {
            userId,
            sources: settings.event_urls,
        });
        return;
    }

    const sources = settings.event_urls.filter((source) => source.url.trim().length > 0);

    if (sources.length === 0) {
        console.log("[event-url] skipped because no valid event_urls are configured:", {
            userId,
        });
        return;
    }

    for (const source of sources) {
        const { todayStr, endStr } = getDateRange(source.refreshInterval);

        console.log("[event-url] starting source refresh:", {
            userId,
            sourceUrl: source.url,
            refreshInterval: source.refreshInterval,
            todayStr,
            endStr,
        });

        await runSingleFlight(`${userId}:${buildSourceKey(source.url)}`, () =>
            refreshSingleCustomEventSource(
                userId,
                source,
                settings.town ?? null,
                openAiKey,
                options?.force ?? false
            )
        );
    }
}


export async function invalidateCustomEventRefreshState(userId: string) {
    await sql`
    DELETE FROM user_event_refresh_state
    WHERE user_id = ${userId}::uuid
      AND source_kind = ${CUSTOM_SOURCE_KIND}
  `;
}
