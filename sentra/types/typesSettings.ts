export interface SettingsClientProps {
  initialSettings: Settings;
}

export type SaveWeatherResult =
  | { success: true; data: Settings }
  | { success: false; error: string };

// SettingsClient.tsx
export interface Settings {
  display_name: string | null;
  lat: number | null;
  lon: number | null;
  town: string | null;
  county: string | null;
  state: string | null;
  country: string | null;
  country_code: string | null;
  channels: string[];
  event_urls: string[];
  evt: boolean;
  wea: boolean;
  mtx: boolean;
  rtc: boolean;
  s_indoor: boolean;
  s_outdoor: boolean;
  s_cal_temp: number;
  s_cal_humidity: number;
  s_cal_pressure: number;
}

export const defaultSettings: Settings = {
  display_name: null,
  lat: null,
  lon: null,
  town: "",
  county: "",
  state: "",
  country: "",
  country_code: "",
  channels: [],
  event_urls: [],
  evt: false,
  wea: false,
  mtx: false,
  rtc: false,
  s_indoor: false,
  s_outdoor: false,
  s_cal_temp: 0,
  s_cal_humidity: 0,
  s_cal_pressure: 0,
};
