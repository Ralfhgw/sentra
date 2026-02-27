export type RegisterResponse = {
  id: string;
};

export interface LocationResult {
  display_name?: string;
  town?: string;
  county?: string;
  state?: string;
  country?: string;
  country_code?: string;
}

export type Address = {
  display_name?: string;
  village?: string;
  hamlet?: string;
  city?: string;
  suburb?: string;
  neighbourhood?: string;
  locality?: string;
  town?: string;
  county?: string;
  state?: string;
  country?: string;
  country_code?: string;
};

export interface GoogleEventsParams {
  display_name: string;
  town: string;
  apiKey: string;
  hl?: string;
  gl?: string;
}

export interface EventData {
  title?: string;
  date?: string | object;
  address?: string | object;
  link?: string;
  description?: string;
  thumbnail?: string;
  image?: string;
}