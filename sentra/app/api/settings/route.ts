import { NextRequest, NextResponse } from "next/server";
import sql from "@/utils/db";
import { getAuthenticatedUserFromCookies } from "@/utils/serverAuth";
import { getEvents } from "@/app/api/settings/getEvents";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await getAuthenticatedUserFromCookies();
    const data = await req.json();

    console.log("Empfangene Settings für userId:", userId, data);

    const safeData = {
      ...data,
      country_code: data.country_code ?? null,
      event_urls: data.event_urls ?? [],
      evt: data.evt ?? false,
      wea: data.wea ?? false,
      mtx: data.mtx ?? false,
      rtc: data.rtc ?? false,
      s_indoor: data.s_indoor ?? false,
      s_outdoor: data.s_outdoor ?? false,
      s_cal_temp: data.s_cal_temp ?? 0,
      s_cal_humidity: data.s_cal_humidity ?? 0,
      s_cal_pressure: data.s_cal_pressure ?? 0,
    };

const [oldSettings] = await sql`
  SELECT lat, lon FROM user_settings WHERE user_id = ${userId}
`;

const latChanged = oldSettings?.lat !== safeData.lat;
const lonChanged = oldSettings?.lon !== safeData.lon;
const locationChanged = latChanged || lonChanged;

    const result = await sql`
      UPDATE user_settings
      SET
        lat = ${safeData.lat},
        lon = ${safeData.lon},
        display_name = ${safeData.display_name},
        town = ${safeData.town},
        county = ${safeData.county},
        state = ${safeData.state},
        country = ${safeData.country},
        country_code = ${safeData.country_code},
        event_urls = ${JSON.stringify(safeData.event_urls)},
        evt = ${safeData.evt},
        wea = ${safeData.wea},
        mtx = ${safeData.mtx},
        rtc = ${safeData.rtc},
        s_indoor = ${safeData.s_indoor},
        s_outdoor = ${safeData.s_outdoor},
        s_cal_temp = ${safeData.s_cal_temp},
        s_cal_humidity = ${safeData.s_cal_humidity},
        s_cal_pressure = ${safeData.s_cal_pressure}
      WHERE user_id = ${userId}
    `;

    console.log("Update-Result:", result);

    // Events von SerpApi für die nächsten 2 Tage holen und speichern
    if (locationChanged && safeData.town) {
      for (let i = 0; i < 2; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        const dayString = date.toISOString().slice(0, 10);
        await getEvents(userId, safeData.town, dayString);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Fehler beim Schreiben in die DB oder beim Event-Import:", error);
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 });
  }
}