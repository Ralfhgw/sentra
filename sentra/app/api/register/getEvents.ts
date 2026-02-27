import { getJson } from "serpapi";
import type { GoogleEventsParams, EventData } from "@/types/typesRegister";
import sql from "@/app/utils/db";

const { SERPAPI_KEY } = process.env;

if (!SERPAPI_KEY) {
    throw new Error("Fehlende SERPAPI-ENV-Variablen – prüfe deine .env");
}

// Function fetchGoogleEvents() ==> return events[]
async function fetchGoogleEvents({
    display_name,
    town,
    apiKey,
    hl = "de",
    gl = "de",
}: GoogleEventsParams): Promise<EventData[]> {
    if (!display_name?.trim()) {
        throw new Error("Parameter 'location' ist erforderlich.");
    }

    try {
        const today = new Date();
        const day = String(today.getDate()).padStart(2, "0");
        const month = String(today.getMonth() + 1).padStart(2, "0");
        const year = today.getFullYear();
        const dateString = `${day}.${month}.${year}`;

        const data = await getJson({
            engine: "google_events",
            q: `Events in ${town} am ${dateString}`,
            google_domain: "google.de",
            hl,
            gl,
            location: display_name,
            api_key: apiKey,
            htichips: "date:next_month",
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

// Function storeEventData() ==> Store Data
async function storeEventData(userId: string, events: EventData[]) {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, "0");
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const year = today.getFullYear();
    const todayString = `${day}.${month}.${year}`;

    await sql`
        DELETE FROM events 
        WHERE user_id = ${userId}
        AND date <= ${todayString}
    `;
    const domain = "https://serpapi.com/"
    for (const event of events) {
        const filtered = filterEventData(event);
        await sql`
            INSERT INTO events (user_id, title, date, address, link, description, image, domain)
            VALUES (
            ${userId}, 
            ${filtered.title}, 
            ${filtered.date}, 
            ${filtered.address}, 
            ${filtered.link}, 
            ${filtered.description}, 
            ${filtered.image},
            ${domain})
        `;
    }
}

// Main Function getEvents() ==> 
export async function getEvents(userId: string, display_name: string, town: string) {
    try {
        const googleEvents = await fetchGoogleEvents({
            display_name,
            town,
            apiKey: SERPAPI_KEY!,
        });

        await storeEventData(userId, googleEvents);
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

