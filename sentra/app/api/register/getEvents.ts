import { getJson } from "serpapi";
import type { GoogleEventsParams, EventData } from "@/types/typesRegister";
import sql from "@/utils/db";

const { SERPAPI_KEY } = process.env;

if (!SERPAPI_KEY) {
    throw new Error("Fehlende SERPAPI-ENV-Variablen – prüfe deine .env");
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
async function storeEventData(userId: string, events: EventData[], date: string) {
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
            INSERT INTO events (user_id, title, date, address, link, description, image, domain)
            VALUES (
                ${userId}, 
                ${filtered.title}, 
                ${isoDate}, 
                ${filtered.address}, 
                ${filtered.link}, 
                ${newDescription}, 
                ${filtered.image},
                ${domain}
            )
        `;
    }
    await sql`
        DELETE FROM events
        WHERE id NOT IN (
            SELECT MIN(id)
            FROM events
            WHERE user_id = ${userId}
            GROUP BY title, date, user_id
        )
        AND user_id = ${userId}
    `;
}

// Main Function getEvents() ==> 
export async function getEvents(userId: string, town: string, dayString: string) {
    try {
        const googleEvents = await fetchGoogleEvents({
            town,
            dayString,
            apiKey: SERPAPI_KEY!,
        });

        await storeEventData(userId, googleEvents, dayString);
        console.log(`Events für User ${userId} gespeichert.`);
    } catch (err) {
        console.error(`Fehler bei User ${userId}:`, err);
    }
}

export {
    fetchGoogleEvents,
    storeEventData,
    filterEventData,
};