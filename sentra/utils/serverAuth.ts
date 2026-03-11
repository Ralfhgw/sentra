import "server-only";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
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

export type ServerAuthResult = {
  userId: string;
  accessToken: string;
  refreshedAccessToken?: string;
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

async function requestRefreshedAccessToken(refreshToken: string) {
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