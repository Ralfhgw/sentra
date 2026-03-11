import ProtectedRoute from "@/components/ProtectedRoute";
import SettingsClient from "@/components/SettingsClient";
import { cookies } from "next/headers";
import { defaultSettings, Settings, SaveWeatherResult } from "@/types/interfaces";
import sql from "@/utils/db"; 
import jwt from "jsonwebtoken";
import { getLocationFromCoords } from "./reverseGeocode"; 

interface JwtPayload {
  sub: string;
}

// Hilfsfunktion, um die User-ID aus dem Token zu extrahieren
async function getUserId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    return decoded.sub;
  } catch {
    return null;
  }
}

// Holt die initialen Einstellungsdaten direkt aus der Datenbank
async function getSettings(): Promise<Settings> {
  const user_id = await getUserId();
  if (!user_id) {
    console.error("Fehler beim Laden der Settings: User-ID nicht gefunden.");
    return defaultSettings;
  }

  try {
    // Führe beide DB-Abfragen parallel aus
    const settingsPromise = sql`
      SELECT meteosource_lat, meteosource_lon, display_name, town, county, state, country
      FROM user_settings
      WHERE user_id = ${user_id}
    `;
    const urlsPromise = sql`
      SELECT url FROM event_urls WHERE user_id = ${user_id}
    `;

    const [settingsResult, urlRows] = await Promise.all([settingsPromise, urlsPromise]);

    const settingsData = settingsResult[0];
    const urls = urlRows.map(row => row.url);

    if (!settingsData) {
      return { ...defaultSettings, urls };
    }

    const data: Settings = {
      meteosource_lat: settingsData.meteosource_lat ? Number(settingsData.meteosource_lat) : null,
      meteosource_lon: settingsData.meteosource_lon ? Number(settingsData.meteosource_lon) : null,
      display_name: settingsData.display_name, // HINZUFÜGEN
      town: settingsData.town,
      county: settingsData.county,
      state: settingsData.state,
      country: settingsData.country,
      urls: urls,
    };
    console.log("SettingsPage getSettings() from DB:", data);
    return data;
  } catch (err) {
    console.error("Fehler beim Laden der Settings aus der DB:", err);
    return defaultSettings;
  }
}

// Speichert die Wetter-Einstellungen direkt in der Datenbank
export async function saveWeather(newSettings: Settings): Promise<SaveWeatherResult> {
  "use server";
  const user_id = await getUserId();
  if (!user_id) {
    return { success: false, error: "Authentifizierung fehlgeschlagen." };
  }

  const { meteosource_lat, meteosource_lon, urls } = newSettings; 

  try {
    let loc = null;
    if (meteosource_lat !== null && meteosource_lon !== null) {
      loc = await getLocationFromCoords(meteosource_lat, meteosource_lon);
    }

    if (loc) {
      await sql`
        UPDATE user_settings
        SET meteosource_lat = ${meteosource_lat},
          meteosource_lon = ${meteosource_lon},
          display_name = ${loc.display_name ?? null},
          town = ${loc.town ?? null},
          county = ${loc.county ?? null},
          state = ${loc.state ?? null},
          country = ${loc.country ?? null},
          country_code = ${loc.country_code ?? null},
          updated_at = NOW()
        WHERE user_id = ${user_id}`;
    }

    const responseData: Settings = { 
      meteosource_lat,
      meteosource_lon,
      display_name: loc?.display_name ?? null,
      town: loc?.town ?? null,
      county: loc?.county ?? null,
      state: loc?.state ?? null,
      country: loc?.country ?? null,
      urls: urls, 
    };

    console.log("SettingsPage saveWeather() to DB:", responseData);
    return { success: true, data: responseData };
  } catch (err) {
    console.error("Fehler in saveWeather:", err);
    return { success: false, error: "Fehler beim Speichern." };
  }
}

export async function saveEventUrls(eventUrls: string[]): Promise<{ success: boolean; error?: string }> {
  "use server";
  const user_id = await getUserId();
  if (!user_id) {
    return { success: false, error: "Authentifizierung fehlgeschlagen." };
  }

  try {

    await sql`DELETE FROM event_urls WHERE user_id = ${user_id}`;

    for (const url of eventUrls) {
      await sql`
        INSERT INTO event_urls (user_id, url, created_at)
        VALUES (${user_id}, ${url}, NOW())
      `;
    }

    console.log("Event-URLs in DB gespeichert für User:", user_id);
    return { success: true };
  } catch (err) {
    console.error("Fehler in saveEventUrls:", err);
    return { success: false, error: "Fehler beim Speichern der Event-URLs." };
  }
}

export default async function SettingsPage() {
  const settings = await getSettings();
  console.log("SettingsPage rendert mit:", settings);

  return (
    <ProtectedRoute>
      <SettingsClient initialSettings={settings} saveWeather={saveWeather} saveEventUrls={saveEventUrls} />
    </ProtectedRoute>
  );
}