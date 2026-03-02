import ProtectedRoute from "@/components/ProtectedRoute";
import NewsClient from "@/components/NewsClient";
import sql from "@/utils/db";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import type { NewsClientProps, JwtPayload, Event, DayMeaning } from "@/types/typesNews";

 async function getNews(): Promise<NewsClientProps> {
  try {
    // Authentification
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      throw new Error("Authentifizierungstoken nicht gefunden.");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    const user_id = decoded.sub;
    console.log("NewsServer UserId: ", user_id); 

    if (!user_id) {
      throw new Error("User-ID konnte nicht aus dem Token gelesen werden.");
    }

    // Preparing - Select Events assigned to user from database 
    const eventsData = sql<Event[]>`
      SELECT title, date, address, link, description, image, domain
      FROM events
      WHERE user_id = ${user_id}
      ORDER BY date DESC
    `;

    // Create current date in format YYYY-MM-DD  
    const today = new Date().toISOString().slice(0, 10);

    // Preparing - Select dayMeaning for current date
    const dayMeaningsData = sql<DayMeaning[]>`
      SELECT name, description, country, url FROM get_days_for_date(${today});
    `;

    // Start selecting data
    const events = await eventsData;
    const dayMeanings = await dayMeaningsData;

    return {
      events: events ?? [],
      dayMeanings: dayMeanings ?? [],
      error: events.length > 0 ? "" : "Keine Events gefunden",
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
      error: errorMessage,
    };
  }
}

export default async function News() {
  const { events, dayMeanings, error } = await getNews();
  return (
    <ProtectedRoute>
      <NewsClient events={events} dayMeanings={dayMeanings} error={error} />
    </ProtectedRoute>
  );
}