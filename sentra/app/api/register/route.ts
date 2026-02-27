import { NextRequest, NextResponse } from "next/server";
import sql from "@/app/utils/db";
import { getLocationFromCoords } from "./reverseGeoCode";
import { getEvents } from "./getEvents";
import { getBackgroundImage } from "./getBackgroundImage";

export async function POST(req: NextRequest) {
  const { userId, lang, lat, lon, evt, wea, mtx, rtc } = await req.json();
  const loc = await getLocationFromCoords(lat, lon);

  console.log({ userId, lang, lat, lon, evt, wea, mtx, rtc, ...loc });

  await sql`INSERT INTO user_settings (
    user_id, lang, lat, lon, display_name, town, county, state, country, country_code,
    evt, wea, mtx, rtc
  ) VALUES (
    ${userId},
    ${lang},
    ${lat},
    ${lon},
    ${loc.display_name ?? null},
    ${loc.town ?? null},
    ${loc.county ?? null},
    ${loc.state ?? null},
    ${loc.country ?? null},
    ${loc.country_code ?? null},
    ${evt ?? null},
    ${wea ?? null},
    ${mtx ?? null},
    ${rtc ?? null}
  )
`;

  if (!loc.display_name) throw new Error("RegisterRoute: <display_name> is undefined.");
  if (!loc.town) throw new Error("RegisterRoute: <town> is undefinded.");
  await getEvents(userId, loc.display_name, loc.town);

  if (!userId || lat == null || lon == null) {
  throw new Error("userId, lat oder lon fehlt!");
}

  await getBackgroundImage(userId, lat, lon);

  return NextResponse.json({ success: true });
}