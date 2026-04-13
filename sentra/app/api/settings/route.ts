import { NextRequest, NextResponse } from "next/server";
import sql from "@/utils/db";
import { getAuthenticatedUserFromCookies } from "@/utils/serverAuth";
import { invalidatePrimaryEventRefreshState, warmEventsForUser } from "@/utils/eventsService";
import type { EventRefreshInterval, EventUrlSetting } from "@/types/typesSettings";

function normalizeEventRefreshInterval(value: unknown): EventRefreshInterval {
  if (value === "weekly" || value === "monthly") {
    return value;
  }
  return "daily";
}

function normalizeEventUrls(value: unknown): EventUrlSetting[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((entry) => {
      if (typeof entry === "string") {
        return {
          url: entry.trim(),
          refreshInterval: "daily" as const,
        };
      }

      return {
        url: String((entry as { url?: unknown }).url ?? "").trim(),
        refreshInterval: normalizeEventRefreshInterval(
          (entry as { refreshInterval?: unknown }).refreshInterval
        ),
      };
    })
    .filter((entry) => entry.url.length > 0);
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await getAuthenticatedUserFromCookies();
    const data = await req.json();

    console.log("Empfangene Settings fuer userId:", userId, data);

    const safeData = {
      ...data,
      country_code: data.country_code ?? null,
      event_urls: normalizeEventUrls(data.event_urls),
      event_refresh_interval: normalizeEventRefreshInterval(data.event_refresh_interval),
      key1: data.key1?.trim() || null,
      key2: data.key2?.trim() || null,
      key3: data.key3?.trim() || null,
      key4: data.key4?.trim() || null,
      key5: data.key5?.trim() || null,
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

    const [oldSettings] = await sql<{
      lat: number | null;
      lon: number | null;
      town: string | null;
      key1: string | null;
      evt: boolean | null;
      event_refresh_interval: string | null;
    }[]>`
      SELECT lat, lon, town, key1, evt, event_refresh_interval
      FROM user_settings
      WHERE user_id = ${userId}
    `;

    const latChanged = oldSettings?.lat !== safeData.lat;
    const lonChanged = oldSettings?.lon !== safeData.lon;
    const locationChanged = latChanged || lonChanged;
    const townChanged = oldSettings?.town !== safeData.town;
    const serpApiKeyChanged = oldSettings?.key1 !== safeData.key1;
    const evtChanged = (oldSettings?.evt ?? false) !== safeData.evt;
    const intervalChanged =
      normalizeEventRefreshInterval(oldSettings?.event_refresh_interval) !==
      safeData.event_refresh_interval;
    const serpRefreshInputsChanged =
      locationChanged ||
      townChanged ||
      serpApiKeyChanged ||
      evtChanged ||
      intervalChanged;

    console.log("[settings] primary refresh flags:", {
      userId,
      locationChanged,
      townChanged,
      serpApiKeyChanged,
      evtChanged,
      intervalChanged,
    });


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
        event_urls = ${sql.json(safeData.event_urls)}::jsonb,
        event_refresh_interval = ${safeData.event_refresh_interval},
        key1 = ${safeData.key1},
        key2 = ${safeData.key2},
        key3 = ${safeData.key3},
        key4 = ${safeData.key4},
        key5 = ${safeData.key5},
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

    console.log("[settings] serpRefreshInputsChanged:", {
      userId,
      locationChanged,
      townChanged,
      serpApiKeyChanged,
      evtChanged,
      intervalChanged,
    });

    if (serpRefreshInputsChanged) {
      await invalidatePrimaryEventRefreshState(userId);
    }

    if (intervalChanged && safeData.evt && safeData.town) {
      void warmEventsForUser(userId).catch((error) => {
        console.error("Event warmup after global interval change failed:", error);
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Fehler beim Schreiben in die DB oder beim Event-Import:", error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}
