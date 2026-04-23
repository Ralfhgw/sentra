export type Channel = {
  id: string;
  tvg_name: string;
  tvg_id: string | null;
  group: string | null;
  location: string | null;
  channel: string | null;
  stream_url: string | null;
  created_at: string | null;
  isFavorite: boolean;
  isHidden: boolean;
};

export type UserChannel = {
  name: string;
  url: string;
  location?: string;
};

export type LiveViewPlaybackProfile = "latency" | "balanced" | "stable";

export type LiveViewQualityCap =
  | "auto"
  | "360p"
  | "480p"
  | "720p"
  | "1080p";

export type WebcamClientProps = {
  mtxEnabled: boolean;
  channels: Channel[];
  userChannels: UserChannel[] | string;
};

