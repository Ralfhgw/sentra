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
  town?: string;
  village?: string;
  hamlet?: string;
  city?: string;
  suburb?: string;
  neighbourhood?: string;
  locality?: string;
  county?: string;
  state?: string;
  country?: string;
  country_code?: string;
};