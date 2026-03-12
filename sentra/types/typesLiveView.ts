export type Channel = {
  id: string;
  tvg_name: string;
  tvg_id: string | null;
  group: string | null;
  location: string | null;
  channel: string | null;
  stream_url: string | null;
  created_at: string | null;

};

export type WebcamClientProps = {
  channels: Channel[];
  userChannels: any[];

};