export type LiveTalkRole = "host" | "member" | "viewer";
export type TransportDirection = "send" | "recv";
export type MediaKind = "audio" | "video";

export type ProducerSummary = {
  producerId: string;
  peerId: string;
  kind: MediaKind;
  displayName: string;
  paused: boolean;
};

export type ChatMessageDto = {
  id: string;
  roomId: string;
  userId: string;
  displayName: string;
  message: string;
  createdAt: string;
};

export type JoinRoomAck =
  | {
      ok: true;
      socketId: string;
      roomId: string;
      roomCode: string;
      displayName: string;
      role: LiveTalkRole;
      routerRtpCapabilities: unknown;
      producers: ProducerSummary[];
      messages: ChatMessageDto[];
    }
  | {
      ok: false;
      error: string;
    };

export type TransportCreateAck =
  | {
      ok: true;
      transport: {
        id: string;
        iceParameters: unknown;
        iceCandidates: unknown[];
        dtlsParameters: unknown;
      };
    }
  | {
      ok: false;
      error: string;
    };

export type GenericAck =
  | { ok: true }
  | { ok: false; error: string };
