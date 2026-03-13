"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "@/context/AuthContext";

type Lang = "en" | "de";

type UserChannel = {
  url: string;
  name: string;
};

type EventUrls = {
  url: string;
};

type UserSettings = {
  lang: Lang;
  lat: number | null;
  lon: number | null;
  displayName: string | null;
  town: string | null;
  county: string | null;
  state: string | null;
  country: string | null;
  country_code: string | null;
  channels: UserChannel[];
  event_urls: EventUrls[];
  evt: boolean;
  wea: boolean;
  mtx: boolean;
  rtc: boolean;
  s_indoor: boolean;
  s_outdoor: boolean;
  s_cal_temp: number | null;
  s_cal_humidity: number | null;
  s_cal_pressure: number | null;
};

type SetSettingsAction =
  | UserSettings
  | ((current: UserSettings) => UserSettings);

type SettingsContextType = {
  settings: UserSettings;
  setSettings: (value: SetSettingsAction) => void;
  lang: Lang;
  setLang: (lang: Lang) => void;
  refreshSettings: () => Promise<void>;
};

const defaultSettings: UserSettings = {
  lang: "en",
  lat: null,
  lon: null,
  displayName: null,
  town: null,
  county: null,
  state: null,
  country: null,
  country_code: null,
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

type SettingsResponse = {
  settings?:
    | UserSettings
    | {
        lang?: Lang;
        lat?: number | null;
        lon?: number | null;
        displayName?: string | null;
        town?: string | null;
        county?: string | null;
        state?: string | null;
        country?: string | null;
        countryCode?: string | null;
        channels?: UserChannel[];
        evt?: boolean;
        wea?: boolean;
        mtx?: boolean;
        rtc?: boolean;
        sIndoor?: boolean;
        sOutdoor?: boolean;
        sCalTemp?: number | null;
        sCalHumidity?: number | null;
        sCalPressure?: number | null;
      };
  lang?: Lang;
  error?: string;
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  setSettings: () => {},
  lang: "en",
  setLang: () => {},
  refreshSettings: async () => {},
});

function toUserSettings(data: SettingsResponse): UserSettings {
  const responseSettings = data.settings;

  if (!responseSettings) {
    return defaultSettings;
  }

  const camelCaseSettings = responseSettings as {
    displayName?: string | null;
    countryCode?: string | null;
    sIndoor?: boolean;
    sOutdoor?: boolean;
    sCalTemp?: number | null;
    sCalHumidity?: number | null;
    sCalPressure?: number | null;
  };

  return {
    ...defaultSettings,
    ...responseSettings,
    displayName:
      responseSettings.displayName ??
      responseSettings.display_name ??
      defaultSettings.displayName,
    country_code:
      responseSettings.country_code ??
      camelCaseSettings.countryCode ??
      defaultSettings.country_code,
    s_indoor:
      responseSettings.s_indoor ??
      camelCaseSettings.sIndoor ??
      defaultSettings.s_indoor,
    s_outdoor:
      responseSettings.s_outdoor ??
      camelCaseSettings.sOutdoor ??
      defaultSettings.s_outdoor,
    s_cal_temp:
      responseSettings.s_cal_temp ??
      camelCaseSettings.sCalTemp ??
      defaultSettings.s_cal_temp,
    s_cal_humidity:
      responseSettings.s_cal_humidity ??
      camelCaseSettings.sCalHumidity ??
      defaultSettings.s_cal_humidity,
    s_cal_pressure:
      responseSettings.s_cal_pressure ??
      camelCaseSettings.sCalPressure ??
      defaultSettings.s_cal_pressure,
  };
}

export function SettingsProvider({
  children,
  initialSettings = defaultSettings,
}: {
  children: React.ReactNode;
  initialSettings?: UserSettings;
}) {
  const [settings, setSettings] = useState<UserSettings>(initialSettings);
  const { user } = useAuth();

  const refreshSettings = useCallback(async () => {
    if (!user?.id) {
      return;
    }

    const res = await fetch("/api/user/lang", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });

    if (!res.ok) {
      throw new Error("User-Settings konnten nicht geladen werden.");
    }

    const data = (await res.json()) as SettingsResponse;
    setSettings(toUserSettings(data));
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) {
      return;
    }

    let cancelled = false;

    fetch("/api/user/lang", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("User-Settings konnten nicht geladen werden.");
        }

        return res.json() as Promise<SettingsResponse>;
      })
      .then((data) => {
        if (!cancelled) {
          setSettings(toUserSettings(data));
        }
      })
      .catch((error) => {
        if (!cancelled) {
          console.error("Fehler beim Laden der User-Settings:", error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const currentSettings = user?.id ? settings : defaultSettings;

  function setLang(lang: Lang) {
    setSettings((current) => ({
      ...current,
      lang,
    }));
  }

  return (
    <SettingsContext.Provider
      value={{
        settings: currentSettings,
        setSettings,
        lang: currentSettings.lang,
        setLang,
        refreshSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);