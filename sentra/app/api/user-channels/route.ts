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
  INSERT INTO user_settings (user_id, channels, updated_at)
  VALUES (
    ${auth.userId}::uuid,
    ${sql.json(channels)}::jsonb,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    channels = EXCLUDED.channels,
    updated_at = now()
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