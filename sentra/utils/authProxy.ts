import { NextRequest, NextResponse } from "next/server";
import { applyAuthServiceHeaders } from "@/utils/authHeaders";
import {
  getAccessToken,
  getExpiresAt,
  getRefreshToken,
  type AuthResponseEnvelope,
} from "@/utils/authResponse";

const AUTH_HOST = process.env.AUTH_HOST ?? process.env.NEXT_PUBLIC_AUTH_HOST;
const isProd = process.env.NODE_ENV === "production";
const refreshTokenMaxAge =
  Number(process.env.AUTH_REFRESH_TOKEN_MAX_AGE_SECONDS ?? 7 * 24 * 60 * 60);

if (!AUTH_HOST) {
  throw new Error("Missing AUTH_HOST (or NEXT_PUBLIC_AUTH_HOST) env var");
}

function copySetCookieHeaders(upstream: Response, response: NextResponse) {
  const getSetCookie = (
    upstream.headers as Headers & { getSetCookie?: () => string[] }
  ).getSetCookie;

  if (typeof getSetCookie === "function") {
    for (const value of getSetCookie.call(upstream.headers)) {
      response.headers.append("set-cookie", value);
    }
    return;
  }

  const setCookie = upstream.headers.get("set-cookie");
  if (setCookie) {
    response.headers.set("set-cookie", setCookie);
  }
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

function applyBodyTokenCookies(
  response: NextResponse,
  data: AuthResponseEnvelope | null
) {
  const accessToken = getAccessToken(data);
  const refreshToken = getRefreshToken(data);

  if (!accessToken && !refreshToken) {
    return;
  }

  const base = getCookieBase();
  const accessTokenMaxAge = getAccessTokenMaxAge(getExpiresAt(data));

  if (accessToken) {
    response.cookies.set("accessToken", accessToken, {
      ...base,
      ...(accessTokenMaxAge ? { maxAge: accessTokenMaxAge } : {}),
    });
  }

  if (refreshToken) {
    response.cookies.set("refreshToken", refreshToken, {
      ...base,
      maxAge: refreshTokenMaxAge,
    });
  }
}

export async function forwardAuthRequest(
  req: NextRequest,
  path: string
): Promise<NextResponse> {
  const { response } = await forwardAuthRequestWithBody(req, path);
  return response;
}

export async function forwardAuthRequestWithBody<T = unknown>(
  req: NextRequest,
  path: string
) {
  const contentType = req.headers.get("content-type");
  const cookie = req.headers.get("cookie");
  const body =
    req.method === "GET" || req.method === "HEAD" ? undefined : await req.text();

  const upstreamHeaders = new Headers();
  if (contentType) {
    upstreamHeaders.set("content-type", contentType);
  }
  if (cookie) {
    upstreamHeaders.set("cookie", cookie);
  }

  applyAuthServiceHeaders(upstreamHeaders);

  const upstream = await fetch(`${AUTH_HOST}${path}`, {
    method: req.method,
    headers: upstreamHeaders,
    body,
    cache: "no-store",
  });

  const bodyText = await upstream.text();

  const response = new NextResponse(bodyText, {
    status: upstream.status,
  });

  const upstreamContentType = upstream.headers.get("content-type");
  if (upstreamContentType) {
    response.headers.set("content-type", upstreamContentType);
  }

  copySetCookieHeaders(upstream, response);

  let data: T | null = null;
  if (bodyText && upstreamContentType?.includes("application/json")) {
    try {
      data = JSON.parse(bodyText) as T;
    } catch {
      data = null;
    }
  }

  applyBodyTokenCookies(response, data as AuthResponseEnvelope | null);

  return {
    response,
    data,
    ok: upstream.ok,
  };
}
