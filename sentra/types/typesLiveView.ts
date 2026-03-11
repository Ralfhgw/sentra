export type WebcamsClientProps = {
  channels: any[];
  userChannels: any[];

};

export type Channel = {
  id: string;
  tvg_name: string;
  tvg_id: string | null;
  group: string | null;
  logo_url: string | null;
  sendername: string | null;
  stream_url: string | null;
  created_at: string | null;

};

export type WebcamClientProps = {
  channels: Channel[];
  userChannels: any[];

};