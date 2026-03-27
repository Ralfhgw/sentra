export const dynamic = 'force-dynamic';
import ProtectedRoute from "@/components/ProtectedRoute";
import NewsClient from "@/components/NewsClient";
import { ensureFreshEventsForUser } from "@/utils/eventsService";
import sql from "@/utils/db";
import { getAuthenticatedUserWithSettingsFromCookies } from "@/utils/serverAuth";
import type { NewsClientProps, Event, DayMeaning } from "@/types/typesNews";

async function getNews(): Promise<NewsClientProps> {
  try {
    const { userId: user_id, settings } = await getAuthenticatedUserWithSettingsFromCookies();

    if (!settings.evt) {
      return {
        events: [],
        dayMeanings: [],
        town: settings.town ?? "",
        error: "",
        evtEnabled: false,
      };
    }

    try {
      await ensureFreshEventsForUser(user_id);
      console.log("NewsServer UserId:", user_id);

      const eventsData = sql<Event[]>`
        SELECT id, title, date, address, link, description, image, domain, source_town AS "sourceTown"
        FROM events
        WHERE user_id = ${user_id}
        ORDER BY source_town ASC, date ASC
      `;

      const today = new Date().toISOString().slice(0, 10);

      const dayMeaningsData = sql<DayMeaning[]>`
        SELECT name, description, country, url FROM get_days_for_date(${today});
      `;

      const events = await eventsData;
      const dayMeanings = await dayMeaningsData;

      return {
        events: events ?? [],
        dayMeanings: dayMeanings ?? [],
        town: settings.town ?? "",
        error: events.length > 0 ? "" : "Keine Events gefunden",
        evtEnabled: true,
      };
    } catch (err) {
      console.error("Fehler beim direkten Datenbankzugriff:", err);

      const errorMessage =
        err instanceof Error && err.message.includes("Token")
          ? err.message
          : "Fehler beim Laden der Events oder Tagesbedeutungen";

      return {
        events: [],
        dayMeanings: [],
        town: settings.town ?? "",
        error: errorMessage,
        evtEnabled: true,
      };
    }
  } catch (err) {
    console.error("Fehler beim Laden der User-Settings:", err);

    const errorMessage =
      err instanceof Error && err.message.includes("Token")
        ? err.message
        : "Fehler beim Laden der Events oder Tagesbedeutungen";

    return {
      events: [],
      dayMeanings: [],
      town: "",
      error: errorMessage,
      evtEnabled: false,
    };
  }
}

export default async function News() {
  const { events, town, dayMeanings, error, evtEnabled } = await getNews();
  return (
    <ProtectedRoute>
      <NewsClient
        events={events}
        town={town}
        dayMeanings={dayMeanings}
        error={error}
        evtEnabled={evtEnabled}
      />
    </ProtectedRoute>
  );
}
