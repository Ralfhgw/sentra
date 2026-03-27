import { sql } from "./db";
import type { LiveTalkRole } from "../types/protocol";

export type RoomRecord = {
  id: string;
  code: string;
  title: string | null;
  status: string;
  expires_at: string | null;
};

export async function getRoomById(roomId: string) {
  const [row] = await sql<RoomRecord[]>`
    SELECT
      id::text AS id,
      code,
      title,
      status,
      expires_at::text AS expires_at
    FROM livetalk_rooms
    WHERE id = ${roomId}::uuid
    LIMIT 1
  `;

  return row ?? null;
}

export async function touchRoomActivity(roomId: string) {
  await sql`
    UPDATE livetalk_rooms
    SET updated_at = now()
    WHERE id = ${roomId}::uuid
  `;
}

export async function markParticipantJoined(input: {
  roomId: string;
  userId: string;
  displayName: string;
  role: LiveTalkRole;
  connectionId: string;
}) {
  await sql`
    INSERT INTO livetalk_participants (
      room_id,
      user_id,
      display_name,
      role,
      connection_id,
      joined_at,
      left_at
    )
    VALUES (
      ${input.roomId}::uuid,
      ${input.userId}::uuid,
      ${input.displayName},
      ${input.role},
      ${input.connectionId},
      now(),
      null
    )
    ON CONFLICT (connection_id) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      role = EXCLUDED.role,
      joined_at = now(),
      left_at = null
  `;
}

export async function markParticipantLeft(connectionId: string) {
  await sql`
    UPDATE livetalk_participants
    SET left_at = now()
    WHERE connection_id = ${connectionId}
      AND left_at IS NULL
  `;
}
