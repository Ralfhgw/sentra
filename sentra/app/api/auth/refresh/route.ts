import { NextRequest, NextResponse } from "next/server";
import { warmStartpageBackground } from "@/app/api/startpage/backgroundService";
import { forwardAuthRequestWithBody } from "@/utils/authProxy";
import { getAuthUserId, type AuthResponseEnvelope } from "@/utils/authResponse";

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

const REFRESH_TOKEN_MAX_AGE_SECONDS = Number(process.env.AUTH_REFRESH_TOKEN_MAX_AGE_SECONDS ?? 7 * 24 * 60 * 60);
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

// Take over the Auth-Refresh-Handling, check result and send answer
export async function POST(req: NextRequest) {
console.log("Call --> /api/auth/refresh")

  const { response, data, ok } = await forwardAuthRequestWithBody<AuthResponseEnvelope>(
    req,
    "/api/auth/refresh"
  );

  const userId = getAuthUserId(data);

  if (ok && userId) {
    console.log("Starting startpage warmup after refresh for userId:", userId);
    void warmStartpageBackground(userId).catch((error) => {
      console.error("Startpage warmup after refresh failed:", error);
    });
  }

  // #### Testeintrag
 const cookieResponse = NextResponse.json({ ok: true })
console.log("/api/auth/refresh Body", data)
  cookieResponse.cookies.set(
    "accessToken",
    data!.accessToken as string,
    getAccessCookieOptions(data!.expiresAt ?? null)
  );

  cookieResponse.cookies.set(
    "refreshToken",
    data!.refreshToken as string,
    getRefreshCookieOptions()
  );
 //  ####

  return response;
}

