import { NextRequest, NextResponse } from "next/server";
import sql from "@/utils/db";
import { getLocationFromCoords } from "./reverseGeoCode";
import { getEvents } from "./getEvents";
import { getBackgroundImage } from "./getBackgroundImage";

type RegisterPayload = {
  username?: string;
  email?: string;
  password?: string;
  lang?: "de" | "en";
  lat?: number;
  lon?: number;
  evt?: boolean;
  wea?: boolean;
  mtx?: boolean;
  rtc?: boolean;
};

type AuthRegisterResponse =
  | {
    id?: string | number;
    user?: { id?: string | number };
    error?: string;
  }
  | string;

const AUTH_HOST = process.env.AUTH_HOST ?? process.env.NEXT_PUBLIC_AUTH_HOST;
const AUTH_REGISTER_PATH = process.env.AUTH_REGISTER_PATH ?? "/api/auth/register";

if (!AUTH_HOST) {
  throw new Error("Missing AUTH_HOST (or NEXT_PUBLIC_AUTH_HOST) env var");
}

function parseJsonSafe(value: string): AuthRegisterResponse {
  try {
    return JSON.parse(value) as AuthRegisterResponse;
  } catch {
    return value;
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as RegisterPayload;

  const username = body.username?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const lang: "de" | "en" = body.lang === "de" ? "de" : "en";
  const lat = Number(body.lat);
  const lon = Number(body.lon);

  if (!username || !email || !password) {
    return NextResponse.json(
      { error: "username, email und password sind Pflicht." },
      { status: 400 }
    );
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json(
      { error: "lat/lon sind ungueltig." },
      { status: 400 }
    );
  }

  // Sends both keys for compatibility with auth server variants.
  const authPayload = {
    username,
    user_name: username,
    email,
    password,
  };

  let authRes: Response;
  try {
    authRes = await fetch(`${AUTH_HOST}${AUTH_REGISTER_PATH}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(authPayload),
      cache: "no-store",
    });
  } catch (err) {
    console.error("Auth register network error:", err);
    return NextResponse.json(
      { error: "Auth-Service nicht erreichbar." },
      { status: 502 }
    );
  }

  const raw = await authRes.text();
  const authData = parseJsonSafe(raw);

  if (!authRes.ok) {
    const message =
      typeof authData === "string"
        ? authData
        : authData.error ?? "Auth-Registrierung fehlgeschlagen.";
    return NextResponse.json({ error: message }, { status: authRes.status });
  }

  const userIdRaw =
    typeof authData === "string" ? undefined : authData.id ?? authData.user?.id;

  if (!userIdRaw) {
    return NextResponse.json(
      { error: "Auth-Antwort enthaelt keine user id.", authData },
      { status: 502 }
    );
  }

  const userId = String(userIdRaw);

  await sql`
  INSERT INTO users (
    id, user_name, hashed_password, email, is_active, email_verified, created_at, updated_at
  ) VALUES (
    ${userId}::uuid,
    ${username},
    ${"external_auth"},
    ${email},
    true,
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    user_name = EXCLUDED.user_name,
    email = EXCLUDED.email,
    updated_at = now()
`;

  try {
    const loc = await getLocationFromCoords(lat, lon);

    await sql.begin(async (tx) => {
      const trx = tx as unknown as typeof sql;

      await trx`
    INSERT INTO users (
      id, user_name, hashed_password, email, is_active, email_verified, created_at, updated_at
    ) VALUES (
      ${userId}::uuid,
      ${username},
      ${"external_auth"},
      ${email},
      true,
      true,
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      user_name = EXCLUDED.user_name,
      email = EXCLUDED.email,
      updated_at = now()
  `;

      await trx`
    INSERT INTO user_settings (
      user_id, lang, lat, lon, display_name, town, county, state, country, country_code,
      evt, wea, mtx, rtc, updated_at
    ) VALUES (
      ${userId}::uuid,
      ${lang},
      ${lat},
      ${lon},
      ${loc.display_name ?? null},
      ${loc.town ?? null},
      ${loc.county ?? null},
      ${loc.state ?? null},
      ${loc.country ?? null},
      ${loc.country_code ?? null},
      ${body.evt ?? null},
      ${body.wea ?? null},
      ${body.mtx ?? null},
      ${body.rtc ?? null},
      now()
    )
    ON CONFLICT (user_id) DO UPDATE SET
      lang = EXCLUDED.lang,
      lat = EXCLUDED.lat,
      lon = EXCLUDED.lon,
      display_name = EXCLUDED.display_name,
      town = EXCLUDED.town,
      county = EXCLUDED.county,
      state = EXCLUDED.state,
      country = EXCLUDED.country,
      country_code = EXCLUDED.country_code,
      evt = EXCLUDED.evt,
      wea = EXCLUDED.wea,
      mtx = EXCLUDED.mtx,
      rtc = EXCLUDED.rtc,
      updated_at = now()
  `;
    });

    if (loc.town) {
      for (let i = 1; i <= 2; i++) {
        const date = new Date();
        date.setDate(date.getDate() + i);
        const dayString = date.toISOString().slice(0, 10);
        await getEvents(userId, loc.town, dayString);
      }
    }

   await getBackgroundImage(userId, lat, lon);

    return NextResponse.json({ success: true, userId });
  } catch (err) {
    console.error("Register bootstrap error:", err);
    return NextResponse.json(
      { error: "User angelegt, aber lokale Initialisierung fehlgeschlagen.", userId },
      { status: 500 }
    );
  }
}