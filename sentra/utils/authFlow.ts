import { NextResponse, type NextRequest } from "next/server";
import sql from "@/utils/db";
import { getLocationFromCoords } from "@/utils/reverseGeoCode";
import { applyAuthServiceHeaders } from "@/utils/authHeaders";
import {
  getAuthErrorMessage,
  getAuthUser,
  getAuthUserId,
  type AuthResponseEnvelope,
} from "@/utils/authResponse";
import { warmStartpageBackground } from "@/app/api/startpage/backgroundService";
import { warmEventsForUser } from "@/utils/eventsService";
import { forwardAuthRequestWithBody } from "@/utils/authProxy";

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

type AuthRegisterResponse = AuthResponseEnvelope | string;

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

export async function handleAuthLogin(req: NextRequest): Promise<NextResponse> {
  const { response, data, ok } = await forwardAuthRequestWithBody<AuthResponseEnvelope>(
    req,
    "/api/auth/login"
  );

  const userId = getAuthUserId(data);

  if (ok && userId) {
    console.log("[auth/login] Starting post-login warmup for userId:", userId);

    void warmStartpageBackground(userId).catch((error) => {
      console.error("[auth/login] Startpage warmup after login failed:", error);
    });

    void warmEventsForUser(userId).catch((error) => {
      console.error("[auth/login] Event warmup after login failed:", error);
    });
  }

  return response;
}

export async function handleAuthRegister(req: NextRequest): Promise<NextResponse> {
  const body = (await req.json()) as RegisterPayload;

  const username = body.username?.trim();
  const email = body.email?.trim().toLowerCase();
  const password = body.password;
  const lang: "de" | "en" = body.lang === "de" ? "de" : "en";
  const lat = Number(body.lat);
  const lon = Number(body.lon);

  if (!username || !email || !password) {
    return NextResponse.json(
      { error: "Username, email, and password are required." },
      { status: 400 }
    );
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return NextResponse.json(
      { error: "lat/lon are not valid." },
      { status: 400 }
    );
  }

  const authPayload = {
    username,
    email,
    password,
  };

  let authRes: Response;
  try {
    const authHeaders = new Headers({ "Content-Type": "application/json" });
    applyAuthServiceHeaders(authHeaders);

    authRes = await fetch(`${AUTH_HOST}${AUTH_REGISTER_PATH}`, {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify(authPayload),
      cache: "no-store",
    });
  } catch (err) {
    console.error("Auth register network error:", err);
    return NextResponse.json(
      { error: "Auth service unavailable." },
      { status: 502 }
    );
  }

  const raw = await authRes.text();
  const authData = parseJsonSafe(raw);

  if (!authRes.ok) {
    const message = getAuthErrorMessage(authData) ?? "Auth registration failed.";
    return NextResponse.json({ error: message }, { status: authRes.status });
  }

  const authUser = typeof authData === "string" ? null : getAuthUser(authData);
  const userIdRaw = authUser?.id;

  if (!userIdRaw) {
    return NextResponse.json(
      { error: "Auth response does not contain a user ID.", authData },
      { status: 502 }
    );
  }

  const userId = String(userIdRaw);
  const pendingActivation = authUser?.status !== "active";

  try {
    const loc = await getLocationFromCoords(lat, lon);

    await sql`
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
        ${body.evt ?? false},
        ${body.wea ?? false},
        ${body.mtx ?? false},
        ${body.rtc ?? false},
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

    return NextResponse.json({
      success: true,
      userId,
      pendingActivation,
      message:
        lang === "de"
          ? "Konto angelegt. Ein Administrator muss den Zugang im Auth-Server zuerst freischalten."
          : "Account created. An administrator must activate access in the auth server first.",
    });
  } catch (err) {
    console.error("Register bootstrap error:", err);
    return NextResponse.json(
      {
        success: true,
        userId,
        pendingActivation,
        warning:
          "User created in the Auth service, but local initialization of user_settings failed.",
      },
      { status: 200 }
    );
  }
}