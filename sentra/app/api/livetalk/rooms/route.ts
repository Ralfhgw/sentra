import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import sql from "@/utils/db";
import {
  applyRefreshedAccessToken,
  getAuthenticatedUserFromRequest,
} from "@/utils/serverAuth";

export const runtime = "nodejs";

type RoomRow = {
  id: string;
  code: string;
  title: string | null;
  owner_user_id: string;
  status: "active" | "closed" | "expired";
  expires_at: string | null;
};

function normalizeRoomCode(code: string) {
  return code.trim().toUpperCase();
}

function mapRoom(row: RoomRow) {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    ownerUserId: row.owner_user_id,
    status: row.status,
    expiresAt: row.expires_at,
  };
}

async function generateUniqueRoomCode() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = normalizeRoomCode(
      crypto.randomBytes(5).toString("hex").slice(0, 10)
    );

    const [existing] = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count
      FROM livetalk_rooms
      WHERE code = ${code}
    `;

    if ((existing?.count ?? 0) === 0) {
      return code;
    }
  }

  throw new Error("Room code could not be generated.");
}

export async function GET(req: NextRequest) {
  let auth;

  try {
    auth = await getAuthenticatedUserFromRequest(req);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nicht eingeloggt";
    return NextResponse.json({ error: message }, { status: 401 });
  }

  try {
    const code = normalizeRoomCode(req.nextUrl.searchParams.get("code") ?? "");

    if (!code) {
      return NextResponse.json(
        { error: "Room-Code fehlt." },
        { status: 400 }
      );
    }

    const [row] = await sql<RoomRow[]>`
      SELECT
        id::text AS id,
        code,
        title,
        owner_user_id::text AS owner_user_id,
        status,
        expires_at::text AS expires_at
      FROM livetalk_rooms
      WHERE code = ${code}
        AND status = 'active'
        AND (expires_at IS NULL OR expires_at > now())
      LIMIT 1
    `;

    if (!row) {
      return NextResponse.json(
        { error: "Room nicht gefunden oder abgelaufen." },
        { status: 404 }
      );
    }

    const response = NextResponse.json({ room: mapRoom(row) });
    return applyRefreshedAccessToken(response, auth);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Room konnte nicht geladen werden.";

    const response = NextResponse.json({ error: message }, { status: 500 });
    return applyRefreshedAccessToken(response, auth);
  }
}

export async function POST(req: NextRequest) {
  let auth;

  try {
    auth = await getAuthenticatedUserFromRequest(req);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nicht eingeloggt";
    return NextResponse.json({ error: message }, { status: 401 });
  }

  try {
    const body = ((await req.json().catch(() => ({}))) ?? {}) as {
      title?: string;
    };

    const code = await generateUniqueRoomCode();
    const title = body.title?.trim() || null;
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000
    ).toISOString();

    const [row] = await sql<RoomRow[]>`
      INSERT INTO livetalk_rooms (
        code,
        owner_user_id,
        title,
        status,
        expires_at
      )
      VALUES (
        ${code},
        ${auth.userId}::uuid,
        ${title},
        'active',
        ${expiresAt}::timestamptz
      )
      RETURNING
        id::text AS id,
        code,
        title,
        owner_user_id::text AS owner_user_id,
        status,
        expires_at::text AS expires_at
    `;

    const response = NextResponse.json(
      { room: mapRoom(row) },
      { status: 201 }
    );

    return applyRefreshedAccessToken(response, auth);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Room konnte nicht erstellt werden.";

    const response = NextResponse.json({ error: message }, { status: 500 });
    return applyRefreshedAccessToken(response, auth);
  }
}
