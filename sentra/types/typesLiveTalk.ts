export type LiveTalkRole = "host" | "member" | "viewer";

export type LiveTalkRoomSummary = {
  id: string;
  code: string;
  title: string | null;
  ownerUserId: string;
  status: "active" | "closed" | "expired";
  expiresAt: string | null;
};

export type LiveTalkProducerSummary = {
  producerId: string;
  peerId: string;
  kind: "audio" | "video";
  displayName: string;
  paused: boolean;
};

export type LiveTalkChatMessage = {
  id: string;
  roomId: string;
  userId: string;
  displayName: string;
  message: string;
  createdAt: string;
};

export type LiveTalkRoomResponse = {
  room: LiveTalkRoomSummary;
};

export type LiveTalkRoomsResponse = {
  rooms: LiveTalkRoomSummary[];
};

export type LiveTalkTokenResponse = {
  token: string;
  socketUrl: string;
  room: LiveTalkRoomSummary;
  role: LiveTalkRole;
  displayName: string;
};

export type LiveTalkClientProps = {
  rtcEnabled: boolean;
};

export type RemoteFeed = {
  peerId: string;
  displayName: string;
  stream: MediaStream;
};

export type FeedEntry = {
  displayName: string;
  stream: MediaStream;
  trackByKind: Map<"audio" | "video", MediaStreamTrack>;
};

