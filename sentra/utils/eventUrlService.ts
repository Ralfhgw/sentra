// Verwaltet Refresh von benutzerdefinierten URL‑Quellen — Gemini‑Abfrage (Web‑Search), 
// CSV‑Parsing, Normalisierung, Deduplikation, Einfügen in DB, Postgres‑Locks und Pflege 
// der Refresh‑Status‑Tabelle; stellt refreshCustomEventSourcesForUser, 
// getCustomEventRefreshStatusForUser, invalidateCustomEventRefreshState bereit.
import { GoogleGenAI } from "@google/genai";
import type { ReservedSql } from "postgres";
import type { EventRefreshInterval, EventUrlSetting } from "@/types/typesSettings";
import sql from "@/utils/db";
import { getUserSettings } from "@/utils/serverAuth";

const CUSTOM_SOURCE_KIND = "url";
const inFlightCustomRefreshes = new Map<string, Promise<void>>();
const GEMINI_REQUEST_TIMEOUT_MS = 180_000;
const CUSTOM_REFRESH_STALE_AFTER_MS = 150_000;

type DbConnection = typeof sql | ReservedSql<Record<string, never>>;

type RefreshStatusRow = {
    source_key: string;
    last_status: string | null;
    last_error: string | null;
    refresh_started_at: string | null;
    last_refreshed_at: string | null;
};

type CustomEventRow = {
    title: string;
    date: string;
    address: string | null;
    link: string | null;
    description: string | null;
    image: string | null;
};

type RefreshCustomEventSourceOptions = {
    targetDay?: string;
};

export type CustomEventRefreshStatus = {
    status: "idle" | "running" | "success" | "error";
    error: string | null;
};

// buildSourceKey(): Erzeugt einen eindeutigen Schlüssel für eine URL-basierte Eventquelle.
function buildSourceKey(url: string) {
    return `url:${url.trim()}`;
}

// getLookaheadDays(): Liefert die Anzahl Tage, die je nach Refresh-Intervall vorausgeschaut werden sollen.
function getLookaheadDays(interval: EventRefreshInterval) {
    switch (interval) {
        case "weekly":
            return 14;
        case "monthly":
            return 60;
        default:
            return 2;
    }
}

// normalizeRequestedDay(): Validiert und normalisiert eine angefragte Datumsvorgabe (YYYY-MM-DD) oder gibt null zurück.
function normalizeRequestedDay(targetDay?: string) {
    if (!targetDay) return null;

    const trimmed = targetDay.trim();
    return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

// getDateRange(): Bestimmt Start- und Enddatum für die Suche basierend auf Intervall und optionalem Zieltag.
function getDateRange(interval: EventRefreshInterval, targetDay?: string) {
    const normalizedTargetDay = normalizeRequestedDay(targetDay);

    if (normalizedTargetDay) {
        return {
            todayStr: normalizedTargetDay,
            endStr: normalizedTargetDay,
        };
    }
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + getLookaheadDays(interval) - 1);

    return {
        todayStr: today.toISOString().slice(0, 10),
        endStr: endDate.toISOString().slice(0, 10),
    };
}

async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string
) {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(timeoutMessage));
        }, timeoutMs);
    });

    try {
        return await Promise.race([promise, timeoutPromise]);
    } finally {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
    }
}

function isRunningRefreshStale(refreshStartedAt: string | null | undefined) {
    if (!refreshStartedAt) {
        return false;
    }

    const startedAt = Date.parse(refreshStartedAt);
    if (Number.isNaN(startedAt)) {
        return false;
    }

    return Date.now() - startedAt >= CUSTOM_REFRESH_STALE_AFTER_MS;
}

// formatDate(): Versucht, verschiedene Datumsformate zu interpretieren und lesbar (de-DE) zu formatieren.
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

// normalizeDate(): Wandelt ein Eingabedatum in ISO-YYYY-MM-DD um oder gibt einen Fallback-Tag zurück.
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

// parseJsonEvents(): Wandelt die JSON-Antwort des Modells in Event-Objekte mit Normalisierung um.
function parseJsonEvents(jsonText: string, sourceUrl: string, fallbackDay: string): CustomEventRow[] {
    let parsed: unknown;

    try {
        parsed = JSON.parse(jsonText);
    } catch {
        throw new Error(
            `[event-url] Gemini lieferte kein valides JSON. Preview: ${jsonText.slice(0, 300)}`
        );
    }

    if (!Array.isArray(parsed)) {
        throw new Error("[event-url] Gemini-Antwort ist kein JSON-Array.");
    }

    return parsed.flatMap((entry): CustomEventRow[] => {
        const item = entry as Record<string, unknown>;
        const title = String(item.title ?? "").trim();

        if (!title || title.toLowerCase() === "kein event gefunden") {
            return [];
        }

        const rawDate = String(item.date ?? "").trim();
        const rawAddress = String(item.address ?? "").trim();
        const rawLink = String(item.link ?? "").trim();
        const rawDescription = String(item.description ?? "").trim();

        return [
            {
                title,
                date: normalizeDate(rawDate, fallbackDay),
                address: rawAddress && rawAddress !== "-" ? rawAddress : null,
                link: rawLink && rawLink !== "-" ? rawLink : sourceUrl,
                description: rawDescription && rawDescription !== "-" ? rawDescription : null,
                image: null,
            },
       ];
    });
}

function extractJsonArray(text: string) {
    const trimmed = text.trim();
    if (trimmed.startsWith("[")) {
        return trimmed;
    }

    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fencedMatch?.[1]) {
        return fencedMatch[1].trim();
    }

    const start = trimmed.indexOf("[");
    const end = trimmed.lastIndexOf("]");
   if (start !== -1 && end !== -1 && end > start) {
        return trimmed.slice(start, end + 1);
    }

    return trimmed;
}

// dedupeEvents(): Entfernt doppelte Events anhand eines zusammengesetzten Schlüssels aus Titel, Datum, Link und Adresse.
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

// fetchGeminiEventsForSource(): Fragt die OpenAI-API an, extrahiert Events als CSV und parst/deduiziert die Ergebnisse.
async function fetchGeminiEventsForSource(
    sourceUrl: string,
    interval: EventRefreshInterval,
    geminiApiKey: string,
    targetDay?: string
) {
    const { todayStr, endStr } = getDateRange(interval, targetDay);
    const isSingleDayRange = todayStr === endStr;

    console.log("[event-url] Gemini fetch start:", {
        sourceUrl,
        todayStr,
        endStr,
    });

    const ai = new GoogleGenAI({ apiKey: geminiApiKey });

const systemInstruction = `
Du bist ein präziser Daten-Scraper. Deine einzige Aufgabe: ZÄHLE UND EXTRAHIERE.

Kernregeln:
1. VOLLSTÄNDIGKEITSMANIE: Wenn 11 Events auf der Seite sind, MUSST du 11 Objekte liefern. Es ist ein Fehler, auch nur eines auszulassen.
2. SCAN-MODUS: Gehe die Seite von oben nach unten durch. Suche in Kacheln, Listen, Tabellen und im unsichtbaren JSON-LD Quelltext.
3. KEIN ABBRUCH: Erfasse JEDEN Termin einzeln für den Zeitraum ${isSingleDayRange ? todayStr : `${todayStr} bis ${endStr}`}.
4. REINES JSON: Gib NUR das JSON-Array zurück. Starte mit [ und ende mit ]. Kein Text davor oder danach.
`.trim();

const userPrompt = `
Besuche die Webseite ${sourceUrl} und extrahiere ALLE Events für den Zeitraum: ${isSingleDayRange ? todayStr : `${todayStr} bis ${endStr}`}.

Arbeitsweise:
1. URL-ANALYSE & NAVIGATION: 
   - Analysiere das Suchformular oder den Kalender auf ${sourceUrl}. Identifiziere, wie Datumsfilter an die URL angehängt werden (z.B. ?start_date=, ?date=, ?q[start_date]=).
   - Konstruiere die spezifische Ziel-URL für den ${todayStr} und rufe diese direkt auf, um die Filterung zu erzwingen.
   - Falls die URL-Struktur nicht erkennbar ist, nutze das Google Search Tool mit 'site:${sourceUrl} "${todayStr}"', um direkt zur Tagesansicht zu springen.

2. VOLLSTÄNDIGE EXTRAKTION:
   - Scanne den gesamten Inhalt nach JEDEM einzelnen Event. Suche explizit im Quelltext nach <script type="application/ld+json">, da dort oft die vollständigen Listen hinterlegt sind.
   - Erfasse für JEDEN Eintrag einzeln: title, date (YYYY-MM-DD), address, link, description.
   - Falls "Mehr laden"-Optionen oder Pagination existieren, folge diesen, bis alle Events des Zeitraums erfasst sind.

3. OUTPUT:
   - Gib NUR ein valides JSON-Array zurück. 
   - Starte direkt mit [ und ende mit ].

Wichtig:
- Wenn die Seite 50 Termine enthält, muss dein JSON-Array 50 Objekte enthalten.
- Kürz die Liste niemals ab (kein "..." oder "weitere Events").
- Keine Erklärungen, kein Begleittext, keine Markdown-Code-Blocks.
`.trim();

    try {
        const response = await withTimeout(
            ai.models.generateContent({
                model: "models/gemini-2.5-flash",
                contents: [
                    {
                        role: "user",
                        parts: [{ text: userPrompt }]
                    }
                ],
                config: {
                    systemInstruction: systemInstruction,
                    tools: [{ googleSearch: {} }],
                },
            }),
            GEMINI_REQUEST_TIMEOUT_MS,
            `[event-url] Gemini request timed out after ${Math.round(GEMINI_REQUEST_TIMEOUT_MS / 1000)}s for ${sourceUrl}`
        );

        const rawText = response.text || "[]";
        const jsonText = extractJsonArray(rawText);
        console.log("[event-url] Gemini raw response length:", rawText.length);
        const events = parseJsonEvents(jsonText, sourceUrl, todayStr);

        console.log("[event-url] parsed events:", {
            sourceUrl,
            count: events.length,
            titles: events.map((event) => event.title),
        });

        return dedupeEvents(events);

    } catch (error) {
        console.error("Custom event URL refresh failed:", error);
        throw error;
    }
}

// fetchOpenAiEventsForSource(): Fragt die OpenAI-API an, extrahiert Events als CSV und parst/deduiziert die Ergebnisse.
async function deleteOldEventsForSource(userId: string, sourceUrl: string) {
    const todayString = new Date().toISOString().slice(0, 10);

    await sql`
    DELETE FROM events
    WHERE user_id = ${userId}::uuid
      AND domain = ${sourceUrl}
      AND date < ${todayString}
  `;
}

// insertCustomEventsForUser(): Fügt neue Events für einen Benutzer ein, vermeidet Duplikate und gibt die Einfüganzahl zurück.
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

// tryAcquireLock(): Versucht, eine PostgreSQL-Advice-Lock für einen Lock-Key zu setzen und gibt Erfolg/Fehlschlag zurück.
async function tryAcquireLock(db: DbConnection, lockKey: string) {
    const [row] = await db<{ locked: boolean }[]>`
    SELECT pg_try_advisory_lock(hashtext(${lockKey})) AS locked
  `;

    return row?.locked ?? false;
}

// releaseLock(): Gibt eine zuvor gesetzte PostgreSQL-Advice-Lock wieder frei.
async function releaseLock(db: DbConnection, lockKey: string) {
    await db`
    SELECT pg_advisory_unlock(hashtext(${lockKey}))
  `;
}

// markUrlRefreshRunning(): Setzt den Refresh-Status für eine Quelle auf "running" in der Status-Tabelle.
async function markUrlRefreshRunning(userId: string, sourceKey: string) {
    await sql`
    INSERT INTO user_event_refresh_state (
      user_id,
      source_key,
      source_kind,
      refresh_started_at,
      last_status,
      last_error
    )
    VALUES (
      ${userId}::uuid,
      ${sourceKey},
      ${CUSTOM_SOURCE_KIND},
      NOW(),
      'running',
      NULL
    )
    ON CONFLICT (user_id, source_key)
    DO UPDATE SET
      source_kind = EXCLUDED.source_kind,
      refresh_started_at = EXCLUDED.refresh_started_at,
      last_status = EXCLUDED.last_status,
      last_error = NULL
  `;
}

// markUrlRefreshSuccess(): Markiert den Refresh einer Quelle als erfolgreich und aktualisiert Zeitstempel.
async function markUrlRefreshSuccess(
    userId: string,
    sourceKey: string
) {
    await sql`
    INSERT INTO user_event_refresh_state (
      user_id,
      source_key,
      source_kind,
      last_refreshed_at,
      refresh_started_at,
      last_status,
      last_error
    )
    VALUES (
      ${userId}::uuid,
      ${sourceKey},
      ${CUSTOM_SOURCE_KIND},
      NOW(),
      NULL,
      'success',
      NULL
    )
    ON CONFLICT (user_id, source_key)
    DO UPDATE SET
      source_kind = EXCLUDED.source_kind,
      last_refreshed_at = EXCLUDED.last_refreshed_at,
      refresh_started_at = NULL,
      last_status = EXCLUDED.last_status,
      last_error = NULL
  `;
}

// markUrlRefreshError(): Protokolliert einen Fehlerstatus und die Fehlermeldung für einen Quellen-Refresh.
async function markUrlRefreshError(
    userId: string,
    sourceKey: string,
    error: unknown
) {
    const message =
        error instanceof Error ? error.message : "Unbekannter URL-Refresh-Fehler";

    await sql`
    INSERT INTO user_event_refresh_state (
      user_id,
      source_key,
      source_kind,
      refresh_started_at,
      last_status,
      last_error
    )
    VALUES (
      ${userId}::uuid,
      ${sourceKey},
      ${CUSTOM_SOURCE_KIND},
      NULL,
      'error',
      ${message}
    )
    ON CONFLICT (user_id, source_key)
    DO UPDATE SET
      source_kind = EXCLUDED.source_kind,
      refresh_started_at = NULL,
      last_status = EXCLUDED.last_status,
      last_error = EXCLUDED.last_error
  `;
}

// hasRefreshStateChangedAfter(): Prüft, ob ein Status-Row nach einem gegebenen Zeitstempel geändert wurde.
function hasRefreshStateChangedAfter(
    row: RefreshStatusRow,
    startedAfter?: string | null
) {
    if (!startedAfter) {
        return true;
    }

    const threshold = Date.parse(startedAfter);
    if (Number.isNaN(threshold)) {
        return true;
    }

    const startedAt = row.refresh_started_at
        ? Date.parse(row.refresh_started_at)
        : Number.NEGATIVE_INFINITY;
    const refreshedAt = row.last_refreshed_at
        ? Date.parse(row.last_refreshed_at)
        : Number.NEGATIVE_INFINITY;

    return startedAt >= threshold || refreshedAt >= threshold;
}

// getCustomEventRefreshStatusForUser(): Aggregiert den Refresh-Status aller konfigurierten URL-Quellen eines Nutzers und gibt Gesamtstatus zurück.
export async function getCustomEventRefreshStatusForUser(
    userId: string,
    options?: { startedAfter?: string | null }
): Promise<CustomEventRefreshStatus> {
    const settings = await getUserSettings(userId);
    const geminiApiKey = settings.key6?.trim();
    const sources = settings.event_urls.filter((source) => source.url.trim().length > 0);

    if (!geminiApiKey || sources.length === 0) {
        return {
            status: "idle",
            error: null,
        };
    }

    const sourceKeys = new Set(sources.map((source) => buildSourceKey(source.url)));
    const rows = await sql<RefreshStatusRow[]>`
      SELECT
        source_key,
        last_status,
        last_error,
        refresh_started_at,
        last_refreshed_at
      FROM user_event_refresh_state
      WHERE user_id = ${userId}::uuid
        AND source_kind = ${CUSTOM_SOURCE_KIND}
    `;

    const relevantRows = rows.filter((row) => sourceKeys.has(row.source_key));
    const currentRows = relevantRows.filter((row) =>
        hasRefreshStateChangedAfter(row, options?.startedAfter)
    );

    const staleRunningRows = currentRows.filter(
        (row) => row.last_status === "running" && isRunningRefreshStale(row.refresh_started_at)
    );

    if (staleRunningRows.length > 0) {
        const timeoutMessage = `[event-url] Refresh timed out after ${Math.round(CUSTOM_REFRESH_STALE_AFTER_MS / 1000)}s without a Gemini response.`;

        await Promise.all(
            staleRunningRows.map((row) =>
                markUrlRefreshError(userId, row.source_key, new Error(timeoutMessage))
            )
        );
        return {
            status: "error",
            error: timeoutMessage,
        };
    }

    const failedRow = currentRows.find((row) => row.last_status === "error");
    if (failedRow) {
        return {
            status: "error",
            error: failedRow.last_error ?? "Unbekannter URL-Refresh-Fehler",
        };
    }

    if (currentRows.some((row) => row.last_status === "running")) {
        return {
            status: "running",
            error: null,
        };
    }

    if (currentRows.length < sourceKeys.size) {
        return {
            status: "running",
            error: null,
        };
    }

    if (currentRows.every((row) => row.last_status === "success")) {
        return {
            status: "success",
            error: null,
        };
    }

    return {
        status: "idle",
        error: null,
    };
}

// runSingleFlight(): Verhindert parallele Ausführungen derselben Arbeit durch Single-flight-Caching von Promises.
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

// refreshSingleCustomEventSource(): Führt für eine einzelne URL-Quelle den kompletten Refresh-Workflow 
// (Lock, Markierung, Gemini-Fetch, Insert, Erfolgs-/Fehler-Markierung) aus.
async function refreshSingleCustomEventSource(
    userId: string,
    source: EventUrlSetting,
    sourceTown: string | null,
    geminiApiKey: string,
    targetDay?: string
) {
    const sourceUrl = source.url.trim();

    if (!sourceUrl) {
        return;
    }

    const sourceKey = buildSourceKey(sourceUrl);
    const lockKey = `events:${userId}:${sourceKey}`;

    const lockConnection = await sql.reserve();
    const locked = await tryAcquireLock(lockConnection, lockKey);

    if (!locked) {
        lockConnection.release();
        return;
    }

    try {
        await markUrlRefreshRunning(userId, sourceKey);

        await deleteOldEventsForSource(userId, sourceUrl);

        const events = await fetchGeminiEventsForSource(
            sourceUrl,
            source.refreshInterval,
            geminiApiKey,
            targetDay
        );

        await insertCustomEventsForUser(userId, sourceUrl, sourceTown, events);

await markUrlRefreshSuccess(userId, sourceKey);
    } catch (error) {
        await markUrlRefreshError(userId, sourceKey, error);
        throw error;
    } finally {
        try {
            await releaseLock(lockConnection, lockKey);
        } finally {
            lockConnection.release();
        }
    }
}

// refreshCustomEventSourcesForUser(): Iteriert alle konfigurierten URL-Quellen eines Nutzers und startet nacheinander deren Refreshs (mit Single-flight).
export async function refreshCustomEventSourcesForUser(
    userId: string,
    options?: RefreshCustomEventSourceOptions
) {
    const settings = await getUserSettings(userId);
    const geminiApiKey = settings.key6?.trim();

    console.log("[event-url] refreshCustomEventSourcesForUser called:", {
        userId,
        sourceCount: settings.event_urls.length,
        sources: settings.event_urls,
        hasGeminiKey: Boolean(geminiApiKey),
        targetDay: options?.targetDay ?? null,
    });

    if (!geminiApiKey) {
        console.log("[event-url] skipped because GEMINI_API_SECRET is missing:", {
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
        const { todayStr, endStr } = getDateRange(
            source.refreshInterval,
            options?.targetDay
        );

        console.log("[event-url] starting source refresh:", {
            userId,
            sourceUrl: source.url,
            refreshInterval: source.refreshInterval,
            targetDay: options?.targetDay ?? null,
            todayStr,
            endStr,
        });

        await runSingleFlight(`${userId}:${buildSourceKey(source.url)}`, () =>
            refreshSingleCustomEventSource(
                userId,
                source,
                settings.town ?? null,
                geminiApiKey,
                options?.targetDay
            )
        );
    }
}

// invalidateCustomEventRefreshState(): Löscht alle Refresh-Status-Einträge für URL-Quellen eines Benutzers.
export async function invalidateCustomEventRefreshState(userId: string) {
    await sql`
    DELETE FROM user_event_refresh_state
    WHERE user_id = ${userId}::uuid
      AND source_kind = ${CUSTOM_SOURCE_KIND}
  `;
}
