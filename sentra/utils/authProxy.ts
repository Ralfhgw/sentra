import { NextRequest, NextResponse } from "next/server";
import { applyAuthServiceHeaders } from "@/utils/authHeaders";
import {
  getAccessToken,
  getExpiresAt,
  getRefreshToken,
  type AuthResponseEnvelope,
} from "@/utils/authResponse";

const isProd = process.env.NODE_ENV === "production";
const refreshTokenMaxAge =
  Number(process.env.AUTH_REFRESH_TOKEN_MAX_AGE_SECONDS ?? 7 * 24 * 60 * 60);


function getRefreshTokenFromCookieHeader(cookieHeader: string | null) {
  if (!cookieHeader) return null;

  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith("refreshToken="));

  if (!match) return null;
  return decodeURIComponent(match.slice("refreshToken=".length));
}

function buildUpstreamBody(
  path: string,
  rawBody: string | undefined,
  cookieHeader: string | null
) {
  if (path !== "/api/auth/refresh") {
    return rawBody;
  }

  const refreshToken = getRefreshTokenFromCookieHeader(cookieHeader);
  if (!refreshToken) {
    return rawBody;
  }

  if (!rawBody) {
    return JSON.stringify({ refreshToken });
  }

  try {
    const parsed = JSON.parse(rawBody) as Record<string, unknown>;
    if (typeof parsed === "object" && parsed !== null && !parsed.refreshToken) {
      return JSON.stringify({ ...parsed, refreshToken });
    }
    return rawBody;
  } catch {
    return JSON.stringify({ refreshToken });
  }
}

function getAuthHost() {
  const authHost = process.env.AUTH_HOST ?? process.env.NEXT_PUBLIC_AUTH_HOST;
  if (!authHost) {
    throw new Error("Missing AUTH_HOST (or NEXT_PUBLIC_AUTH_HOST) env var");
  }
  return authHost;
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

export function clearLocalAuthCookies(response: NextResponse) {
  const base = getCookieBase();

  response.cookies.set("accessToken", "", {
    ...base,
    maxAge: 0,
  });

  response.cookies.set("refreshToken", "", {
    ...base,
    maxAge: 0,
  });

  return response;
}

export async function forwardAuthRequestWithBody<T = unknown>(
  req: NextRequest,
  path: string
) {
  const contentType = req.headers.get("content-type");
  const cookie = req.headers.get("cookie");
  const rawBody =
    req.method === "GET" || req.method === "HEAD" ? undefined : await req.text();
    const body = buildUpstreamBody(path, rawBody, cookie);

  const upstreamHeaders = new Headers();
  if (contentType) {
    upstreamHeaders.set("content-type", contentType);
  }
  if (cookie) {
    upstreamHeaders.set("cookie", cookie);
  }

  applyAuthServiceHeaders(upstreamHeaders);

  const upstream = await fetch(`${getAuthHost()}${path}`, {
    method: req.method,
    headers: upstreamHeaders,
    body,
    cache: "no-store",
  });

  const bodyText = await upstream.text();

  if (!upstream.ok && path === "/api/auth/refresh") {
    console.error("[auth/refresh proxy] upstream failed", {
      status: upstream.status,
      body: bodyText,
      hasCookieHeader: Boolean(cookie),
      forwardedBody: body,
    });
  }


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
