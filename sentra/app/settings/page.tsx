import ProtectedRoute from "@/components/ProtectedRoute";
import SettingsClient from "@/components/SettingsClient";
import sql from "@/utils/db";
import { getAuthenticatedUserFromCookies } from "@/utils/serverAuth";
import { defaultSettings } from "@/types/typesSettings";

interface UserSettingsRow {
  user_id: string | null;
  lang: string;
  lat: number | null;
  lon: number | null;
  displayName: string | null;
  town: string | null;
  county: string | null;
  state: string | null;
  country: string | null;
  country_code: string | null;
  channels: [];
  event_urls: [];
  key1: string | null;
  key2: string | null;
  key3: string | null;
  key4: string | null;
  key5: string | null;
  evt: boolean;
  wea: boolean;
  mtx: boolean;
  rtc: boolean;
  s_indoor: boolean;
  s_outdoor: boolean;
  s_cal_temp: number | null;
  s_cal_humidity: number | null;
  s_cal_pressure: number | null;
}

async function getSettings() {
  const { userId } = await getAuthenticatedUserFromCookies();
  const [row] = await sql<UserSettingsRow[]>`
  SELECT * FROM user_settings WHERE user_id = ${userId}::uuid LIMIT 1
`;
  return row
    ? {
      ...defaultSettings,
      ...row,
      evt: row.evt ?? false,
      wea: row.wea ?? false,
      mtx: row.mtx ?? false,
      rtc: row.rtc ?? false,
      s_indoor: row.s_indoor ?? false,
      s_outdoor: row.s_outdoor ?? false,
      s_cal_temp: row.s_cal_temp !== null ? Number(row.s_cal_temp) : 0,
      s_cal_humidity: row.s_cal_humidity !== null ? Number(row.s_cal_humidity) : 0,
      s_cal_pressure: row.s_cal_pressure !== null ? Number(row.s_cal_pressure) : 0,
    }
    : defaultSettings;
}

export default async function SettingsPage() {
  const initialSettings = await getSettings();
  return (
    <ProtectedRoute>
      <SettingsClient initialSettings={initialSettings} />
    </ProtectedRoute>
  );
}