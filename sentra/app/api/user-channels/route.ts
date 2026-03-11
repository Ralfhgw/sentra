import { NextRequest, NextResponse } from "next/server";
import sql from "@/utils/db";
import {
  applyRefreshedAccessToken,
  getAuthenticatedUserFromRequest,
} from "@/utils/serverAuth";

export async function POST(req: NextRequest) {
  let auth;

  try {
    auth = await getAuthenticatedUserFromRequest(req);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nicht eingeloggt";

    return NextResponse.json({ error: message }, { status: 401 });
  }

  const { channels } = await req.json();

  try {
    await sql`
      UPDATE user_settings
      SET channels = ${JSON.stringify(channels)}::jsonb
      WHERE user_id = ${auth.userId}::uuid
    `;

    const response = NextResponse.json({ success: true });
    return applyRefreshedAccessToken(response, auth);
  } catch (err) {
    console.error("Fehler beim Speichern:", err);

    const response = NextResponse.json(
      { error: "Fehler beim Speichern" },
      { status: 500 }
    );

    return applyRefreshedAccessToken(response, auth);
  }
}