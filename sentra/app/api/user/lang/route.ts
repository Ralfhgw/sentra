import { NextRequest, NextResponse } from "next/server";
import {
  applyRefreshedAccessToken,
  getAuthenticatedUserWithSettingsFromRequest,
} from "@/utils/serverAuth";

export async function GET(req: NextRequest) {
  let auth;

  try {
    auth = await getAuthenticatedUserWithSettingsFromRequest(req);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nicht eingeloggt";

    return NextResponse.json({ error: message }, { status: 401 });
  }

  const response = NextResponse.json({
    settings: auth.settings,
    lang: auth.settings.lang,
  });

  return applyRefreshedAccessToken(response, auth);
}