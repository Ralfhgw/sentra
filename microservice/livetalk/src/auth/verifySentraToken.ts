import jwt from "jsonwebtoken";
import { config } from "../config";
import type { LiveTalkRole } from "../types/protocol";

export type LiveTalkTokenPayload = {
  sub: string;
  roomId: string;
  roomCode: string;
  displayName: string;
  role: LiveTalkRole;
  iat?: number;
  exp?: number;
};

export function verifyLiveTalkToken(rawToken: string) {
  if (!rawToken) {
    throw new Error("Missing LiveTalk token.");
  }

  const decoded = jwt.verify(rawToken, config.liveTalkJwtSecret) as Partial<LiveTalkTokenPayload>;

  if (!decoded.sub || !decoded.roomId || !decoded.roomCode || !decoded.displayName || !decoded.role) {
    throw new Error("Invalid LiveTalk token payload.");
  }

  if (!["host", "member", "viewer"].includes(decoded.role)) {
    throw new Error("Invalid LiveTalk role.");
  }

  return decoded as LiveTalkTokenPayload;
}
