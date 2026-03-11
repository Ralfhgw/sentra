import sql from "@/utils/db";
import { getAuthenticatedUserFromCookies } from "@/utils/serverAuth";

export async function getUserCoordinates() {
  const { userId } = await getAuthenticatedUserFromCookies();

  const [row] = await sql<{ lat: number | null; lon: number | null }[]>`
    SELECT lat::float8 AS lat, lon::float8 AS lon
    FROM user_settings
    WHERE user_id = ${userId}::uuid
    LIMIT 1
  `;

  if (!row || row.lat == null || row.lon == null) {
    throw new Error("Keine Koordinaten in user_settings gefunden.");
  }

  return { lat: row.lat, lon: row.lon };
}