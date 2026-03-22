import "server-only";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import sql from "@/utils/db";
import { applyAuthServiceHeaders } from "@/utils/authHeaders";
import type { NextRequest, NextResponse } from "next/server";

type CookieValue = {
  value: string;
};

type CookieReader = {
  get(name: string): CookieValue | undefined;
};

type AuthTokenPayload = {
  sub?: string;
  id?: string;
};

type RefreshResponse = {
  accessToken?: string;
  user?: {
    id?: string | number;
    user_name?: string;
    email?: string;
  };
  error?: string;
};

type UserChannel = {
  url: string;
  name: string;
};

type EventUrl = {
  url: string;
};

type EventUrlsValue = EventUrl[] | string[] | string | null;

type UserChannelsValue = UserChannel[] | string | null;

type UserSettingsRow = {
  lang: string | null;
  lat: number | string | null;
  lon: number | string | null;
  display_name: string | null;
  town: string | null;
  county: string | null;
  state: string | null;
  country: string | null;
  country_code: string | null;
  channels: UserChannelsValue;
  event_urls: EventUrlsValue;
  key1: string | null;
  key2: string | null;
  key3: string | null;
  key4: string | null;
  key5: string | null;
  evt: boolean | null;
  wea: boolean | null;
  mtx: boolean | null;
  rtc: boolean | null;
  s_indoor: boolean | null;
  s_outdoor: boolean | null;
  s_cal_temp: number | string | null;
  s_cal_humidity: number | string | null;
  s_cal_pressure: number | string | null;
};

export type UserSettings = {
  lang: "en" | "de";
  lat: number | null;
  lon: number | null;
  displayName: string | null;
  town: string | null;
  county: string | null;
  state: string | null;
  country: string | null;
  countryCode: string | null;
  channels: UserChannel[];
  event_urls: EventUrl[];
  key1: string | null;
  key2: string | null;
  key3: string | null;
  key4: string | null;
  key5: string | null;
  evt: boolean;
  wea: boolean;
  mtx: boolean;
  rtc: boolean;
  sIndoor: boolean;
  sOutdoor: boolean;
  sCalTemp: number | null;
  sCalHumidity: number | null;
  sCalPressure: number | null;
};

export const defaultUserSettings: UserSettings = {
  lang: "en",
  lat: null,
  lon: null,
  displayName: null,
  town: null,
  county: null,
  state: null,
  country: null,
  countryCode: null,
  channels: [],
  event_urls: [],
  evt: false,
  wea: false,
  mtx: false,
  rtc: false,
  sIndoor: false,
  sOutdoor: false,
  sCalTemp: null,
  sCalHumidity: null,
  sCalPressure: null,
};

export type ServerAuthResult = {
  userId: string;
  accessToken: string;
  refreshedAccessToken?: string;
};

export type ServerAuthWithSettingsResult = ServerAuthResult & {
  settings: UserSettings;
};

function getAuthHost() {
  const authHost = process.env.AUTH_HOST ?? process.env.NEXT_PUBLIC_AUTH_HOST;
  if (!authHost) {
    throw new Error("AUTH_HOST not configured");
  }
  return authHost;
}

function getAccessCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: 60,
  } as const;
}

function getUserIdFromToken(accessToken: string) {
  const decoded = jwt.verify(
    accessToken,
    process.env.JWT_SECRET!
  ) as AuthTokenPayload;

  const userId = decoded.sub ?? decoded.id;
  if (!userId) {
    throw new Error("User-ID konnte nicht aus dem Token gelesen werden.");
  }

  return String(userId);
}

function normalizeUserChannels(value: UserChannelsValue): UserChannel[] {
  if (Array.isArray(value)) {
    return value;
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function normalizeEventUrls(value: EventUrlsValue): EventUrl[] {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [];
    }

    if (typeof value[0] === "string") {
      return (value as string[])
        .map((url) => url.trim())
        .filter((url) => url.length > 0)
        .map((url) => ({ url }));
    }

    return (value as EventUrl[])
      .map((entry) => ({ url: String(entry?.url ?? "").trim() }))
      .filter((entry) => entry.url.length > 0);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as EventUrlsValue;
      return normalizeEventUrls(parsed);
    } catch {
      return [];
    }
  }

  return [];
}

function normalizeNumber(value: number | string | null | undefined) {
  if (value == null) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function getUserSettings(userId: string): Promise<UserSettings> {
  const [row] = await sql<UserSettingsRow[]>`
    SELECT
      lang,
      lat::float8 AS lat,
      lon::float8 AS lon,
      display_name,
      town,
      county,
      state,
      country,
      country_code,
      channels,
      event_urls,
      key1,
      key2,
      key3,
      key4,
      key5,
      evt,
      wea,
      mtx,
      rtc,
      s_indoor,
      s_outdoor,
      s_cal_temp::float8 AS s_cal_temp,
      s_cal_humidity::float8 AS s_cal_humidity,
      s_cal_pressure::float8 AS s_cal_pressure
    FROM user_settings
    WHERE user_id = ${userId}::uuid
    LIMIT 1
  `;

  if (!row) {
    return defaultUserSettings;
  }

  return {
    lang: row.lang === "de" ? "de" : "en",
    lat: normalizeNumber(row.lat),
    lon: normalizeNumber(row.lon),
    displayName: row.display_name,
    town: row.town,
    county: row.county,
    state: row.state,
    country: row.country,
    countryCode: row.country_code,
    channels: normalizeUserChannels(row.channels),
    event_urls: normalizeEventUrls(row.event_urls),
    key1: row.key1,
    key2: row.key2,
    key3: row.key3,
    key4: row.key4,
    key5: row.key5,
    evt: row.evt ?? false,
    wea: row.wea ?? false,
    mtx: row.mtx ?? false,
    rtc: row.rtc ?? false,
    sIndoor: row.s_indoor ?? false,
    sOutdoor: row.s_outdoor ?? false,
    sCalTemp: normalizeNumber(row.s_cal_temp),
    sCalHumidity: normalizeNumber(row.s_cal_humidity),
    sCalPressure: normalizeNumber(row.s_cal_pressure),
  };
}

async function requestRefreshedAccessToken(refreshToken: string) {
  const headers = new Headers({
    Cookie: "refreshToken=" + refreshToken,
    "Content-Type": "application/json",
  });

  applyAuthServiceHeaders(headers);

  const refreshRes = await fetch(getAuthHost() + "/api/auth/refresh", {
    method: "POST",
    headers: {
      Cookie: "refreshToken=" + refreshToken,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!refreshRes.ok) {
    throw new Error("Refresh des Access-Tokens fehlgeschlagen.");
  }

  const refreshData = (await refreshRes.json()) as RefreshResponse;
  if (!refreshData.accessToken) {
    throw new Error("Refresh lieferte kein Access-Token.");
  }

  return refreshData.accessToken;
}

async function authenticateWithCookies(
  cookieStore: CookieReader
): Promise<ServerAuthResult> {
  const accessToken = cookieStore.get("accessToken")?.value;
  const refreshToken = cookieStore.get("refreshToken")?.value;

  if (accessToken) {
    try {
      const userId = getUserIdFromToken(accessToken);
      return {
        userId,
        accessToken,
      };
    } catch {
      // Access-Token fehlt, ist abgelaufen oder ist anderweitig ungültig.
    }
  }

  if (!refreshToken) {
    throw new Error("Weder Access- noch Refresh-Token gefunden.");
  }

  const refreshedAccessToken = await requestRefreshedAccessToken(refreshToken);
  const userId = getUserIdFromToken(refreshedAccessToken);

  return {
    userId,
    accessToken: refreshedAccessToken,
    refreshedAccessToken,
  };
}

export async function getAuthenticatedUserFromCookies() {
  return authenticateWithCookies(await cookies());
}

export async function getAuthenticatedUserFromRequest(req: NextRequest) {
  return authenticateWithCookies(req.cookies);
}

export async function getAuthenticatedUserWithSettingsFromCookies(): Promise<ServerAuthWithSettingsResult> {
  const auth = await getAuthenticatedUserFromCookies();
  const settings = await getUserSettings(auth.userId);

  return {
    ...auth,
    settings,
  };
}

export async function getAuthenticatedUserWithSettingsFromRequest(
  req: NextRequest
): Promise<ServerAuthWithSettingsResult> {
  const auth = await getAuthenticatedUserFromRequest(req);
  const settings = await getUserSettings(auth.userId);

  return {
    ...auth,
    settings,
  };
}

export function applyRefreshedAccessToken(
  response: NextResponse,
  auth: ServerAuthResult
) {
  if (!auth.refreshedAccessToken) {
    return response;
  }

  response.cookies.set(
    "accessToken",
    auth.refreshedAccessToken,
    getAccessCookieOptions()
  );

  return response;
}