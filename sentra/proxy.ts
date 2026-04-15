import { NextRequest, NextResponse } from "next/server";
import {
  getAccessToken,
  getExpiresAt,
  getRefreshToken,
  type AuthResponseEnvelope,
} from "@/utils/authResponse";

const isProd = process.env.NODE_ENV === "production";
const refreshTokenMaxAge =
  Number(process.env.AUTH_REFRESH_TOKEN_MAX_AGE_SECONDS ?? 7 * 24 * 60 * 60);
const refreshMarginMs =
  Number(process.env.AUTH_ACCESS_TOKEN_REFRESH_MARGIN_SECONDS ?? 60) * 1000;

function getInternalAppUrl() {
  return (process.env.SENTRA_INTERNAL_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");
}

function getCookieBase() {
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
    path: "/",
  } as const;
}

function getAccessTokenMaxAge(expiresAt: string | null) {
  if (!expiresAt) {
   return undefined;
  }

  const expiresAtMs = Date.parse(expiresAt);
  if (Number.isNaN(expiresAtMs)) {
    return undefined;
  }

  const maxAge = Math.floor((expiresAtMs - Date.now()) / 1000);
  return maxAge > 0 ? maxAge : undefined;
}

function decodeJwtExp(accessToken: string) {
  try {
    const payloadPart = accessToken.split(".")[1];
    if (!payloadPart) {
      return null;
    }

    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
    const payload = JSON.parse(atob(padded)) as { exp?: number };

    return typeof payload.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function shouldRefreshAccessToken(accessToken: string | undefined) {
  if (!accessToken) {
    return true;
  }

  const expMs = decodeJwtExp(accessToken);
  if (!expMs) {
    return true;
  }

  return expMs <= Date.now() + refreshMarginMs;
}

function upsertCookieHeader(
  cookieHeader: string,
  name: string,
  value: string
) {
  const cookieMap = new Map<string, string>();

  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    const rawValue = trimmed.slice(eqIndex + 1).trim();
    cookieMap.set(key, rawValue);
  }

  cookieMap.set(name, encodeURIComponent(value));

  return Array.from(cookieMap.entries())
    .map(([key, rawValue]) => `${key}=${rawValue}`)
    .join("; ");
}

async function refreshSession(request: NextRequest, refreshToken: string) {
  const headers = new Headers({
    "Content-Type": "application/json",
    Cookie: `refreshToken=${encodeURIComponent(refreshToken)}`,
  });

  try {
    const refreshRes = await fetch(`${getInternalAppUrl()}/api/auth/refresh`, {
      method: "POST",
      headers,
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
    });

    if (!refreshRes.ok) {
      console.warn("[middleware] refreshSession upstream failed:", refreshRes.status);
      return null;
    }

    const refreshData = (await refreshRes.json()) as AuthResponseEnvelope;
    const accessToken = getAccessToken(refreshData);

    if (!accessToken) {
      return null;
    }

    return {
      accessToken,
      refreshToken: getRefreshToken(refreshData) ?? refreshToken,
      expiresAt: getExpiresAt(refreshData),
    };
  } catch (error) {
    console.error("[middleware] refreshSession fetch failed:", error);
    return null;
  }
}

export async function proxy(request: NextRequest) {
  console.log("[middleware] path:", request.nextUrl.pathname);
  const accessToken = request.cookies.get("accessToken")?.value;
  const refreshToken = request.cookies.get("refreshToken")?.value;

  if (!refreshToken || !shouldRefreshAccessToken(accessToken)) {
    return NextResponse.next();
  }
  console.log("[middleware] refreshing token for", request.nextUrl.pathname);
  const refreshed = await refreshSession(request, refreshToken);
  if (!refreshed) {
    return NextResponse.next();
  }

  const requestHeaders = new Headers(request.headers);
  let cookieHeader = request.headers.get("cookie") ?? "";

  cookieHeader = upsertCookieHeader(
    cookieHeader,
    "accessToken",
    refreshed.accessToken
  );
  cookieHeader = upsertCookieHeader(
    cookieHeader,
    "refreshToken",
    refreshed.refreshToken
  );

  requestHeaders.set("cookie", cookieHeader);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const base = getCookieBase();
  const accessTokenMaxAge = getAccessTokenMaxAge(refreshed.expiresAt);

  response.cookies.set("accessToken", refreshed.accessToken, {
    ...base,
    ...(accessTokenMaxAge ? { maxAge: accessTokenMaxAge } : {}),
  });

  response.cookies.set("refreshToken", refreshed.refreshToken, {
    ...base,
    maxAge: refreshTokenMaxAge,
  });

  return response;
}

export const config = {
  matcher: [
    "/weather/:path*",
    "/news/:path*",
    "/liveview/:path*",
    "/livetalk/:path*",
    "/settings/:path*",
  ],
};