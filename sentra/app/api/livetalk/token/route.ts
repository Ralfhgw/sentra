import jwt from "jsonwebtoken";
import { NextRequest, NextResponse } from "next/server";
import sql from "@/utils/db";
import {
  applyRefreshedAccessToken,
  getAuthenticatedUserWithSettingsFromRequest,
} from "@/utils/serverAuth";
import type { LiveTalkRole } from "@/types/typesLiveTalk";

export const runtime = "nodejs";

type RoomRow = {
  id: string;
  code: string;
  title: string | null;
  owner_user_id: string;
  status: "active" | "closed" | "expired";
  expires_at: string | null;
};

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

export async function POST(req: NextRequest) {
  let auth;

  try {
    auth = await getAuthenticatedUserWithSettingsFromRequest(req);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Nicht eingeloggt";
    return NextResponse.json({ error: message }, { status: 401 });
  }

  try {
    const body = (await req.json()) as {
      roomId?: string;
      receiveOnly?: boolean;
      userName?: string;
    };

    const userName = body.userName?.trim();

    if (!body.roomId) {
      return NextResponse.json({ error: "roomId fehlt." }, { status: 400 });
    }

    if (!userName) {
      return NextResponse.json({ error: "userName fehlt." }, { status: 400 });
    }

    const [room] = await sql<RoomRow[]>`
      SELECT
        id::text AS id,
        code,
        title,
        owner_user_id::text AS owner_user_id,
        status,
        expires_at::text AS expires_at
      FROM livetalk_rooms
      WHERE id = ${body.roomId}::uuid
        AND status = 'active'
        AND (expires_at IS NULL OR expires_at > now())
      LIMIT 1
    `;

    if (!room) {
      return NextResponse.json(
        { error: "Room nicht gefunden oder abgelaufen." },
        { status: 404 }
      );
    }

    const secret = process.env.LIVETALK_JWT_SECRET;
    if (!secret) {
      throw new Error("LIVETALK_JWT_SECRET fehlt.");
    }

    const displayName = userName;

    const role: LiveTalkRole =
      body.receiveOnly
        ? "viewer"
        : room.owner_user_id === auth.userId
          ? "host"
          : "member";


    const token = jwt.sign(
      {
        sub: auth.userId,
        roomId: room.id,
        roomCode: room.code,
        displayName,
        role,
      },
      secret,
      { expiresIn: "1h" }
    );

    const response = NextResponse.json({
      token,
      socketUrl:
        process.env.NEXT_PUBLIC_LIVETALK_SOCKET_URL ?? "http://localhost:3011",
      room: mapRoom(room),
      role,
      displayName,
    });

    return applyRefreshedAccessToken(response, auth);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Token konnte nicht erstellt werden.";

    const response = NextResponse.json({ error: message }, { status: 500 });
    return applyRefreshedAccessToken(response, auth);
  }
}
