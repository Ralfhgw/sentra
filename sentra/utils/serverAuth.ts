import "server-only";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { createRemoteJWKSet, decodeProtectedHeader, jwtVerify, type JWTPayload } from "jose";
import type { EventRefreshInterval } from "@/types/typesSettings";
import sql from "@/utils/db";
import { applyAuthServiceHeaders } from "@/utils/authHeaders";
import type { NextRequest, NextResponse } from "next/server";
import { getAccessToken, getAuthUserId, getExpiresAt, getRefreshToken, type AuthResponseEnvelope } from "@/utils/authResponse";

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

type VerifiedAuthTokenPayload = JWTPayload & AuthTokenPayload;

type RefreshResponse = AuthResponseEnvelope;

type RefreshedSession = {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string | null;
  userId: string;
};


type UserChannel = {
  url: string;
  name: string;
};

type LiveViewChannelPreference = {
  channelId: string;
  isFavorite: boolean;
  hidden: boolean;
  deleted: boolean;
};

type EventUrl = {
  url: string;
  refreshInterval: EventRefreshInterval;
};

type EventUrlsValue = EventUrl[] | string[] | string | null;

type UserChannelsValue = UserChannel[] | string | null;
type LiveViewChannelPreferencesValue = LiveViewChannelPreference[] | string | null;

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
  liveview_channel_preferences: LiveViewChannelPreferencesValue;
  event_urls: EventUrlsValue;
  event_refresh_interval: string | null;
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
  liveviewChannelPreferences: LiveViewChannelPreference[];
  event_urls: EventUrl[];
  eventRefreshInterval: EventRefreshInterval;
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
  liveviewChannelPreferences: [],
  event_urls: [],
  eventRefreshInterval: "daily",
  key1: null,
  key2: null,
  key3: null,
  key4: null,
  key5: null,
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
  refreshedRefreshToken?: string;
  refreshedAccessTokenExpiresAt?: string | null;
};

export type ServerAuthWithSettingsResult = ServerAuthResult & {
  settings: UserSettings;
};

const REFRESH_TOKEN_MAX_AGE_SECONDS = Number(process.env.AUTH_REFRESH_TOKEN_MAX_AGE_SECONDS ?? 7 * 24 * 60 * 60);
const AUTH_JWKS_URL =
  process.env.AUTH_JWKS_URL ??
  (process.env.AUTH_HOST ? `${process.env.AUTH_HOST}/api/auth/jwks` : undefined);
const AUTH_JWT_ISSUER = process.env.AUTH_JWT_ISSUER;

const remoteJwks =
  AUTH_JWKS_URL ? createRemoteJWKSet(new URL(AUTH_JWKS_URL)) : null;

function getAuthHost() {
  const authHost = process.env.AUTH_HOST ?? process.env.NEXT_PUBLIC_AUTH_HOST;
  if (!authHost) {
    throw new Error("AUTH_HOST not configured");
  }
  return authHost;
}

function getAccessCookieOptions(expiresAt: string | null = null) {
  const isProd = process.env.NODE_ENV === "production";
  const expiresAtMs = expiresAt ? Date.parse(expiresAt) : Number.NaN;
  const maxAge =
    Number.isFinite(expiresAtMs) && expiresAtMs > Date.now()
      ? Math.floor((expiresAtMs - Date.now()) / 1000)
      : undefined;
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    ...(maxAge ? { maxAge } : {}),
  } as const;
}

function getRefreshCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
    maxAge: REFRESH_TOKEN_MAX_AGE_SECONDS,
  } as const;
}

async function verifyAuthToken(accessToken: string): Promise<VerifiedAuthTokenPayload> {
  const header = decodeProtectedHeader(accessToken);

  if (header.alg?.startsWith("RS")) {
    if (!remoteJwks) {
      throw new Error("AUTH_JWKS_URL not configured for RSA/JWKS token verification.");
    }

    const { payload } = await jwtVerify(accessToken, remoteJwks, {
      algorithms: [header.alg],
      ...(AUTH_JWT_ISSUER ? { issuer: AUTH_JWT_ISSUER } : {}),
    });

    return payload as VerifiedAuthTokenPayload;
  }

  return jwt.verify(accessToken, process.env.JWT_SECRET!) as VerifiedAuthTokenPayload;
}

async function getUserIdFromToken(accessToken: string) {
  const decoded = await verifyAuthToken(accessToken);

  const userId = decoded.sub ?? decoded.id;
  if (!userId) {
    throw new Error("User-ID konnte nicht aus dem Token gelesen werden.");
  }

  return String(userId);
}

function decodeUserIdFromToken(accessToken: string) {
  const decoded = jwt.decode(accessToken) as AuthTokenPayload | null;
  const userId = decoded?.sub ?? decoded?.id;

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

function normalizeLiveViewChannelPreferences(
  value: LiveViewChannelPreferencesValue
): LiveViewChannelPreference[] {
  const rawValue =
    typeof value === "string"
      ? (() => {
          try {
            return JSON.parse(value);
          } catch {
            return [];
          }
        })()
      : value;

  if (!Array.isArray(rawValue)) {
    return [];
  }

  return rawValue
    .map((entry) => {
      const item = entry as Partial<LiveViewChannelPreference> | null;

      return {
        channelId: String(item?.channelId ?? "").trim(),
        isFavorite: item?.isFavorite === true,
        hidden: item?.hidden === true,
        deleted: item?.deleted === true,
      };
    })
    .filter((entry) => entry.channelId.length > 0);
}

function normalizeEventRefreshInterval(value: unknown): EventRefreshInterval {
  if (value === "weekly" || value === "monthly") {
    return value;
  }

  return "daily";
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
        .map((url) => ({ url, refreshInterval: "daily" as const }));
    }

    return (value as EventUrl[])
      .map((entry) => ({
        url: String(entry?.url ?? "").trim(),
        refreshInterval: normalizeEventRefreshInterval(entry?.refreshInterval),
      }))
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
      liveview_channel_preferences,
      event_urls,
      event_refresh_interval,
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
    liveviewChannelPreferences: normalizeLiveViewChannelPreferences(
      row.liveview_channel_preferences
    ),
    event_urls: normalizeEventUrls(row.event_urls),
    eventRefreshInterval: normalizeEventRefreshInterval(row.event_refresh_interval),
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

async function requestRefreshedSession(refreshToken: string): Promise<RefreshedSession> {
  const headers = new Headers({
    "Content-Type": "application/json",
  });

  headers.set("Cookie", "refreshToken=" + refreshToken);

  applyAuthServiceHeaders(headers);

  const refreshRes = await fetch(getAuthHost() + "/api/auth/refresh", {
    method: "POST",
    headers,
    body: JSON.stringify({ refreshToken }),
    cache: "no-store",
  });

  if (!refreshRes.ok) {
    throw new Error("Refresh des Access-Tokens fehlgeschlagen.");
  }

  const refreshData = (await refreshRes.json()) as RefreshResponse;
  const accessToken = getAccessToken(refreshData);
  const refreshedRefreshToken = getRefreshToken(refreshData);
  const expiresAt = getExpiresAt(refreshData);
  const userId = getAuthUserId(refreshData);

  if (!accessToken) {
    throw new Error("Refresh lieferte kein Access-Token.");
  }

  return {
    accessToken,
    refreshToken: refreshedRefreshToken,
    expiresAt,
    userId: userId ?? decodeUserIdFromToken(accessToken),
  };
}

async function authenticateWithCookies(
  cookieStore: CookieReader
): Promise<ServerAuthResult> {
  const accessToken = cookieStore.get("accessToken")?.value;
  const refreshToken = cookieStore.get("refreshToken")?.value;

  if (accessToken) {
    try {
      const userId = await getUserIdFromToken(accessToken);
      return {
        userId,
        accessToken,
      };
    } catch (error) {
      console.error("[serverAuth] accessToken verification failed:", error);
      console.error("[serverAuth] refreshToken present:", Boolean(refreshToken));
    }
  }

  if (!refreshToken) {
    throw new Error("Weder Access- noch Refresh-Token gefunden.");
  }

  const refreshedSession = await requestRefreshedSession(refreshToken);

  return {
    userId: refreshedSession.userId,
    accessToken: refreshedSession.accessToken,
    refreshedAccessToken: refreshedSession.accessToken,
    refreshedRefreshToken: refreshedSession.refreshToken ?? undefined,
    refreshedAccessTokenExpiresAt: refreshedSession.expiresAt,
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
    getAccessCookieOptions(auth.refreshedAccessTokenExpiresAt ?? null)
  );

  if (auth.refreshedRefreshToken) {
    response.cookies.set(
      "refreshToken",
      auth.refreshedRefreshToken,
      getRefreshCookieOptions()
    );
  }

  return response;
}