import { getJson } from "serpapi";
import type { GoogleEventsParams, EventData } from "@/types/typesRegister";
import sql from "@/utils/db";

async function getSerpApiKeyForUser(userId: string): Promise<string> {
    const [row] = await sql<{ key1: string | null }[]>`
        SELECT key1
        FROM user_settings
        WHERE user_id = ${userId}::uuid
        LIMIT 1
    `;

    const apiKey = row?.key1?.trim();

    if (!apiKey) {
        throw new Error(`Kein SERPAPI_KEY in user_settings.key1 für User ${userId}`);
    }

    return apiKey;
}

// Function fetchGoogleEvents() ==> return events[]
async function fetchGoogleEvents({
    town,
    dayString,
    apiKey,
    hl = "de",
    gl = "de",

}: GoogleEventsParams): Promise<EventData[]> {

    try {
        const data = await getJson({
            engine: "google_events",
            q: `Events in ${town}`,
            htichips: `date:${dayString}`,
            google_domain: "google.de",
            hl,
            gl,
            location: town,
            api_key: apiKey,
        });

        const events = data.events_results || [];
        return events;
    } catch (error) {
        console.error("SerpApi-Fehler:", error);
        return [];
    }
}

// Function filterEventsData() ==> return EventData{}
function filterEventData(event: EventData) {
    return {
        title: event.title || "",
        date: typeof event.date === "object" ? JSON.stringify(event.date) : (event.date || ""),
        address: event.address ? JSON.stringify(event.address) : null,
        link: event.link || null,
        description: event.description || null,
        image: event.thumbnail || event.image || null,
    };
}

// Preparing date format
function formatDate(date: string): string {
    if (!date) return "";
    try {
        const obj = JSON.parse(date);
        if (obj.when) return obj.when;
        if (obj.start_date) return obj.start_date;
    } catch {
        const d = new Date(date);
        if (!isNaN(d.getTime())) {
            return d.toLocaleDateString("de-DE", {
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

// Function storeEventData() ==> Store Data
async function storeEventData(userId: string, town: string, events: EventData[], date: string) {
    const today = new Date();
    const todayString = today.toISOString().slice(0, 10);

    try {
        await sql`
        DELETE FROM events 
        WHERE user_id = ${userId}
        AND date < ${todayString}
    `;
    } catch (error) {
        console.error("Fehler beim Löschen alter Events:", error);
    }
    const domain = "https://serpapi.com/"
    for (const event of events) {
        const filtered = filterEventData(event);

        // Speichere das übergebene Datum (ISO-Format)
        const isoDate = date;

        let newDescription = filtered.description || "";
        if (filtered.date) {
            newDescription += `\n[Original date: ${formatDate(filtered.date)}]`;
        }

        await sql`
            INSERT INTO events (user_id, title, date, address, link, description, image, domain, source_town)
            SELECT
                ${userId},
                ${filtered.title},
                ${isoDate},
                ${filtered.address},
                ${filtered.link},
                ${newDescription},
                ${filtered.image},
                ${domain},
                ${town}
            WHERE NOT EXISTS (
                SELECT 1
                FROM events
                WHERE user_id = ${userId}
                AND title = ${filtered.title}
                AND date = ${isoDate}
                AND COALESCE(link, '') = COALESCE(${filtered.link}, '')
                AND COALESCE(address::text, '') = COALESCE(${filtered.address}, '')
                AND COALESCE(domain, '') = COALESCE(${domain}, '')
                AND COALESCE(source_town, '') = COALESCE(${town}, '')
            )
        `;
    }
}

async function cleanupSerpApiDuplicates(userId: string, town: string, dayString: string) {
  await sql`
    DELETE FROM events e
    USING events e2
    WHERE e.user_id = ${userId}::uuid
      AND e.user_id = e2.user_id
      AND e.domain = 'https://serpapi.com/'
      AND e2.domain = 'https://serpapi.com/'
      AND e.date = ${dayString}
      AND e2.date = ${dayString}
      AND COALESCE(e.source_town, '') = COALESCE(${town}, '')
      AND COALESCE(e2.source_town, '') = COALESCE(${town}, '')
      AND e.title = e2.title
      AND e.ctid > e2.ctid
  `;
}

// Main Function getEvents() ==> 
export async function getEvents(userId: string, town: string, dayString: string) {
  try {
    const apiKey = await getSerpApiKeyForUser(userId);

    const googleEvents = await fetchGoogleEvents({
      town,
      dayString,
      apiKey,
    });

    const storedCount = await storeEventData(userId, town, googleEvents, dayString);
    await cleanupSerpApiDuplicates(userId, town, dayString);

    console.log("[serpapi] refresh finished:", {
      userId,
      town,
      dayString,
      fetched: googleEvents.length,
      stored: storedCount,
      titles: googleEvents.slice(0, 5).map((event) => event.title),
    });
  } catch (err) {
    console.error(`[serpapi] Fehler bei User ${userId}:`, err);
  }
}


export {
    fetchGoogleEvents,
    storeEventData,
    filterEventData,
};