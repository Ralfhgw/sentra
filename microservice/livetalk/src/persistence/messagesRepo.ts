import { config } from "../config";
import { sql } from "./db";
import type { ChatMessageDto } from "../types/protocol";

type MessageRow = {
  id: string;
  room_id: string;
  user_id: string;
  display_name: string;
  message: string;
  created_at: string;
};

function mapMessage(row: MessageRow): ChatMessageDto {
  return {
    id: row.id,
    roomId: row.room_id,
    userId: row.user_id,
    displayName: row.display_name,
    message: row.message,
    createdAt: row.created_at
  };
}

export async function getRecentMessages(roomId: string, limit = config.chatHistoryLimit) {
  const rows = await sql<MessageRow[]>`
    SELECT
      id::text AS id,
      room_id::text AS room_id,
      user_id::text AS user_id,
      display_name,
      message,
      created_at::text AS created_at
    FROM livetalk_messages
    WHERE room_id = ${roomId}::uuid
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  return Array.from(rows).reverse().map(mapMessage);
}

export async function saveMessage(input: {
  roomId: string;
  userId: string;
  displayName: string;
  message: string;
}) {
  const [row] = await sql<MessageRow[]>`
    INSERT INTO livetalk_messages (
      room_id,
      user_id,
      display_name,
      message
    )
    VALUES (
      ${input.roomId}::uuid,
      ${input.userId}::uuid,
      ${input.displayName},
      ${input.message}
    )
    RETURNING
      id::text AS id,
      room_id::text AS room_id,
      user_id::text AS user_id,
      display_name,
      message,
      created_at::text AS created_at
  `;

  return mapMessage(row);
}
