import { NextRequest, NextResponse } from "next/server";
import sql from "@/app/utils/db";
import { getLocationFromCoords } from "./reverseGeoCode";

export async function POST(req: NextRequest) {
  const { userId, lat, lon, evt, wea, mtx, rtc } = await req.json();
  const loc = await getLocationFromCoords(lat, lon);

  console.log({ userId, lat, lon, evt, wea, mtx, rtc, ...loc });

  await sql`
  INSERT INTO user_settings (
    user_id, lat, lon, display_name, town, county, state, country, country_code,
    evt, wea, mtx, rtc
  ) VALUES (
    ${userId},
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

  return NextResponse.json({ success: true });
}