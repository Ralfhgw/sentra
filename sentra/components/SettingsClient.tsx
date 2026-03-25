"use client";
import { type EventRefreshInterval, type EventUrlSetting, Settings, SettingsClientProps } from "@/types/typesSettings";
import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { useSettings } from "@/context/SettingsContext";
import { MoveableScrollAreaVertical } from "@/components/CompMovableScrollAreaVertical"
/*  import "leaflet/dist/leaflet.css";  */
const MapSelector = dynamic(() => import("@/components/CompMapSelector"), { ssr: false });

interface SensorData {
  temp: number;
  hum: number;
  pres: number;
  dew?: number;
}

type SensorStatus = "online" | "offline" | null;

interface DualSensorState {
  indoor: SensorData | null;
  outdoor: SensorData | null;
  indoorStatus?: SensorStatus;
  outdoorStatus?: SensorStatus;
}

const KEY_FIELDS = ["key1", "key2", "key3", "key4", "key5"] as const;

type KeyField = (typeof KEY_FIELDS)[number];
type KeyInputState = {
  [field in KeyField]: string;
};

const EVENT_REFRESH_OPTIONS: EventRefreshInterval[] = ["daily", "weekly", "monthly"];

function getNextEventRefreshInterval(
  current: EventRefreshInterval
): EventRefreshInterval {
  const currentIndex = EVENT_REFRESH_OPTIONS.indexOf(current);
  const nextIndex = currentIndex === -1
    ? 0
    : (currentIndex + 1) % EVENT_REFRESH_OPTIONS.length;

  return EVENT_REFRESH_OPTIONS[nextIndex];
}

function getEventRefreshIntervalLabel(interval: EventRefreshInterval) {
  switch (interval) {
    case "weekly":
      return "Wöchentlich";
    case "monthly":
      return "Monatlich";
    default:
      return "Täglich";
  }
}

function getEventRefreshIntervalClasses(interval: EventRefreshInterval) {
  switch (interval) {
    case "weekly":
      return "bg-blue-200 hover:bg-blue-300";
    case "monthly":
      return "bg-red-200 hover:bg-red-300";
    default:
      return "bg-green-200 hover:bg-green-300";
  }
}

function createEmptyKeyInputs(): KeyInputState {
  return Object.fromEntries(KEY_FIELDS.map(field => [field, ""])) as KeyInputState;
}

function getKeyPlaceholder(value: string | null | undefined) {
  if (!value) return "Kein Key hinterlegt";
  return `${value.slice(0, 5)}...`;
}

function mergeSettingsWithKeyInputs(settings: Settings, keyInputs: KeyInputState): Settings {
  return KEY_FIELDS.reduce((nextSettings, field) => {
    const nextValue = keyInputs[field].trim();
    return {
      ...nextSettings,
      [field]: nextValue || nextSettings[field] || null,
    };
  }, { ...settings });
}

export default function SettingsClient({ initialSettings }: SettingsClientProps) {


  // Es wird der aktuelle Wert aus dem Settings-Context geholt und userSettings genannt
  const { settings: userSettings, setSettings: setUserSettings } = useSettings();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [error, setError] = useState<string>("");
  const [sensorValues, setSensorValues] = useState<DualSensorState>({ indoor: null, outdoor: null });
  const [borderColor, setBorderColor] = useState<"none" | "green" | "red">("none");

  // User Settings displayed in Formular
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [compareSettings, setCompareSettings] = useState<Settings>(initialSettings);
  const [keyInputs, setKeyInputs] = useState<KeyInputState>(createEmptyKeyInputs);

  const normalizeEventUrls = (eventUrls: EventUrlSetting[] | undefined) => {
    if (!Array.isArray(eventUrls)) return [];
    return eventUrls
      .map(({ url, refreshInterval }) => ({
        url: url.trim(),
        refreshInterval,
      }))
      .filter(({ url }) => url.length > 0)
      .sort((a, b) =>
        `${a.url}:${a.refreshInterval}`.localeCompare(`${b.url}:${b.refreshInterval}`)
      );
  };

  // Fill Settings with Context data
  useEffect(() => {
    if (userSettings) {
      const eventUrls = Array.isArray(userSettings.event_urls)
        ? userSettings.event_urls
        : [];
      setSettings(prev => ({
        ...prev,
        lat: userSettings.lat,
        lon: userSettings.lon,
        town: userSettings.town,
        county: userSettings.county,
        state: userSettings.state,
        country: userSettings.country,
        country_code: userSettings.country_code,
        evt: userSettings.evt,
        wea: userSettings.wea,
        mtx: userSettings.mtx,
        rtc: userSettings.rtc,
        s_indoor: userSettings.s_indoor,
        s_outdoor: userSettings.s_outdoor,
        s_cal_temp: userSettings.s_cal_temp ?? 0,
        s_cal_humidity: userSettings.s_cal_humidity ?? 0,
        s_cal_pressure: userSettings.s_cal_pressure ?? 0,
        event_urls: eventUrls,
        event_refresh_interval: userSettings.event_refresh_interval,
      }));
      setCompareSettings(prev => ({
        ...prev,
        lat: userSettings.lat,
        lon: userSettings.lon,
        town: userSettings.town,
        county: userSettings.county,
        state: userSettings.state,
        country: userSettings.country,
        country_code: userSettings.country_code,
        s_indoor: userSettings.s_indoor,
        s_outdoor: userSettings.s_outdoor,
        s_cal_temp: userSettings.s_cal_temp ?? 0,
        s_cal_humidity: userSettings.s_cal_humidity ?? 0,
        s_cal_pressure: userSettings.s_cal_pressure ?? 0,
        event_urls: eventUrls,
        event_refresh_interval: userSettings.event_refresh_interval,
        key1: userSettings.key1 ?? null,
        key2: userSettings.key2 ?? null,
        key3: userSettings.key3 ?? null,
        key4: userSettings.key4 ?? null,
        key5: userSettings.key5 ?? null,
      }));
    }
  }, [userSettings]);

  // Retrieve Sensordata
  useEffect(() => {
    async function fetchSensorData() {
      try {
        const response = await fetch('/api/sensor');
        const result = await response.json();

        if (result.wert) {
          const newSensorData: DualSensorState = {
            indoor: null,
            outdoor: null,
            indoorStatus: result.wert.indoorStatus || "offline",
            outdoorStatus: result.wert.outdoorStatus || "offline"
          };

          if (result.wert.indoor) {
            try {
              newSensorData.indoor = JSON.parse(result.wert.indoor);
              console.log("newSensorData.indoor:", newSensorData.indoor);
            } catch (e) {
              console.error("Parse Error Indoor", e);
            }
          }
          if (result.wert.outdoor) {
            try {
              newSensorData.outdoor = JSON.parse(result.wert.outdoor);
              console.log("newSensorData.outdoor:", newSensorData.outdoor);
            } catch (e) {
              console.error("Parse Error Outdoor", e);
            }
          }
          setSensorValues(newSensorData);
        }
      } catch (error) {
        console.error("Fehler beim Laden der Sensordaten:", error);
      }
    }

    fetchSensorData();
    // Optional: Wenn du regelmäßig aktualisieren willst, Intervall aktivieren:
    // const intervalId = window.setInterval(fetchSensorData, 60 * 1000);
    // return () => window.clearInterval(intervalId);
  }, []);

  // Calculate Offset Data
  const handleCalculateOffset = () => {
    if (
      sensorValues.indoor &&
      sensorValues.outdoor &&
      sensorValues.indoorStatus === "online" &&
      sensorValues.outdoorStatus === "online"
    ) {
      // Temperatur
      const avgTemp = (sensorValues.indoor.temp + sensorValues.outdoor.temp) / 2;
      const offsetTemp = Math.round((sensorValues.indoor.temp - avgTemp) * 1000) / 1000;

      // Luftfeuchtigkeit
      const avgHum = (sensorValues.indoor.hum + sensorValues.outdoor.hum) / 2;
      const offsetHum = Math.round((sensorValues.indoor.hum - avgHum) * 1000) / 1000;

      // Luftdruck
      const avgPres = (sensorValues.indoor.pres + sensorValues.outdoor.pres) / 2;
      const offsetPres = Math.round((sensorValues.indoor.pres - avgPres) * 1000) / 1000;

      setSettings(prev => ({
        ...prev,
        s_cal_temp: offsetTemp,
        s_cal_humidity: offsetHum,
        s_cal_pressure: offsetPres
      }));
    }
  };

  // UseState -  List of Events
  const [urlInput, setUrlInput] = useState("");
  const [urlRefreshInterval, setUrlRefreshInterval] = useState<EventRefreshInterval>("daily");

  console.log("User Settings:", userSettings);
  console.log("Lang:", userSettings.lang);
  console.log("Lat:", userSettings.lat);
  console.log("Lon:", userSettings.lon);
  console.log("DisplayName:", userSettings.displayName);
  console.log("Town:", userSettings.town);
  console.log("County:", userSettings.county);
  console.log("State:", userSettings.state);
  console.log("Country:", userSettings.country);
  console.log("Country Code:", userSettings.country_code);
  console.log("EVT:", userSettings.evt);
  console.log("wea:", userSettings.wea);
  console.log("mtx:", userSettings.mtx);
  console.log("rtc:", userSettings.rtc);
  console.log("sIndoor:", userSettings.s_indoor);
  console.log("sOutdoor:", userSettings.s_outdoor);
  console.log("sCalTemp:", userSettings.s_cal_temp);
  console.log("sCalHumidity:", userSettings.s_cal_humidity);
  console.log("sCalPressure:", userSettings.s_cal_pressure);
  console.log("EventURLs:", userSettings.event_urls);

  const handleKeyChange = (field: KeyField, value: string) => {
    setKeyInputs((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddUrl = () => {
    const trimmedUrl = urlInput.trim();
    if (!trimmedUrl) return;

    setSettings((prev) => {
      if (prev.event_urls.some((entry) => entry.url === trimmedUrl)) {
        return prev;
      }

      const updatedUrls = [
        ...prev.event_urls,
        { url: trimmedUrl, refreshInterval: urlRefreshInterval },
      ];
      console.log("Aktuelle URLs:", updatedUrls);
      return {
        ...prev,
        event_urls: updatedUrls,
      };
    });
    setUrlInput("");
    setUrlRefreshInterval("daily");
  };

  const handleRemoveUrl = (url: string) => {
    setSettings((prev) => ({
      ...prev,
      event_urls: prev.event_urls.filter((entry) => entry.url !== url),
    }));
  };

  const handleUrlRefreshChange = (url: string, refreshInterval: EventRefreshInterval) => {
    setSettings((prev) => ({
      ...prev,
      event_urls: prev.event_urls.map((entry) =>
        entry.url === url ? { ...entry, refreshInterval } : entry
      ),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setStatus("idle");
    const nextSettings = mergeSettingsWithKeyInputs(settings, keyInputs);
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextSettings),
      });
      if (!response.ok) throw new Error("Fehler beim Speichern!");
      setSettings(nextSettings);
      setCompareSettings(nextSettings);
      setUserSettings((currentSettings) => ({
        ...currentSettings,
        lat: nextSettings.lat,
        lon: nextSettings.lon,
        town: nextSettings.town,
        county: nextSettings.county,
        state: nextSettings.state,
        country: nextSettings.country,
        country_code: nextSettings.country_code,
        event_urls: nextSettings.event_urls,
        event_refresh_interval: nextSettings.event_refresh_interval,
        key1: nextSettings.key1,
        key2: nextSettings.key2,
        key3: nextSettings.key3,
        key4: nextSettings.key4,
        key5: nextSettings.key5,
        evt: nextSettings.evt,
        wea: nextSettings.wea,
        mtx: nextSettings.mtx,
        rtc: nextSettings.rtc,
        s_indoor: nextSettings.s_indoor,
        s_outdoor: nextSettings.s_outdoor,
        s_cal_temp: nextSettings.s_cal_temp,
        s_cal_humidity: nextSettings.s_cal_humidity,
        s_cal_pressure: nextSettings.s_cal_pressure,
      }));
      setKeyInputs(createEmptyKeyInputs());
      setStatus("success");
      setBorderColor("green");
      setTimeout(() => setBorderColor("none"), 2000);
    } catch (e: unknown) {
      if (e instanceof Error) {
        console.error("Fehler bei Datenspeicherung:", e.message);
      }
      setStatus("error");
      setBorderColor("red");
      setTimeout(() => setBorderColor("none"), 2000);
      setError("Standortdaten konnten nicht geladen werden.");
      setStatus("error");
    } finally {
      setSaving(false);
    }
  };

  // Fetch Locationdaten, wenn in der Karte geklickt wird.
  async function fetchLocationData(lat: number, lon: number) {
    const res = await fetch(`api/settings/reverseGeoCode?lat=${lat}&lon=${lon}`);
    if (!res.ok) throw new Error("Fehler beim Abrufen der Standortdaten");
    return res.json();
  }

  function hasUnsavedChanges() {
    return (
      settings.s_indoor !== compareSettings.s_indoor ||
      settings.s_outdoor !== compareSettings.s_outdoor ||
      settings.lat !== compareSettings.lat ||
      settings.lon !== compareSettings.lon ||
      settings.town !== compareSettings.town ||
      settings.county !== compareSettings.county ||
      settings.state !== compareSettings.state ||
      settings.country !== compareSettings.country ||
      settings.country_code !== compareSettings.country_code ||
      settings.s_cal_temp !== compareSettings.s_cal_temp ||
      settings.s_cal_humidity !== compareSettings.s_cal_humidity ||
      settings.s_cal_pressure !== compareSettings.s_cal_pressure ||
      settings.event_refresh_interval !== compareSettings.event_refresh_interval ||
      JSON.stringify(normalizeEventUrls(settings.event_urls)) !==
      JSON.stringify(normalizeEventUrls(compareSettings.event_urls)) ||
      KEY_FIELDS.some((field) => settings[field] !== compareSettings[field]) ||
      KEY_FIELDS.some((field) => keyInputs[field].trim().length > 0)
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-1 w-full h-full mx-auto overflow-x-hidden min-w-0">
      <MoveableScrollAreaVertical className="flex-1 min-w-0 box-border w-screen lg:w-[calc(100vw-100px)] h-dvh lg:h-[calc(100dvh-100px)] overflow-x-hidden bg-gray-200 text-gray-800 lg:p-4 no-scrollbar shadow-md cursor-grab select-none">

        <header className="rounded-2xl border border-slate-200/70 bg-white/70 p-6 shadow-lg backdrop-blur-sm">
          <h1 className="text-3xl font-bold tracking-tight text-slate-800">Einstellungen</h1>
          <p className="mt-2 text-sm text-slate-600">
            Verwalte Standort, Eventquellen und Sensor-Kalibrierung in einer Übersicht.
          </p>
        </header>


        <form
          onSubmit={e => {
            e.preventDefault();
            handleSave();
          }}
        >

          <div className="my-2 flex flex-row flex-wrap gap-2 items-center">
            {/* MapSelector */}
            <div className="w-100 h-100 rounded-2xl overflow-hidden border border-gray-300 shadow-sm">
              {/*               <MapSelector
                lat={settings.lat ?? 52.520008}
                lon={settings.lon ?? 13.404954}
                onChange={async (lat, lon) => {
                  setSettings(prev => ({
                    ...prev,
                    lat,
                    lon,
                  }));
                  try {
                    const location = await fetchLocationData(lat, lon);
                    setSettings(prev => ({
                      ...prev,
                      lat,
                      lon,
                      town: location.town,
                      county: location.county,
                      state: location.state,
                      country: location.country,
                      country_code: location.country_code,
                    }));
                  } catch (e) {
                    console.error("Fehler beim Abrufen der Standortdaten:", e);
                    setError("Standortdaten konnten nicht geladen werden.");
                  }
                }}
              /> */}
            </div>
            {/* Location Details */}
            <article className="w-100 h-100 rounded-lg border border-slate-200 bg-white/80 p-4 shadow-md">
              <h2 className="mb-3 bg-gray-200 rounded-lg text-center text-lg font-semibold text-slate-800">Standortdetails</h2>
              <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <div className="rounded-lg bg-gray-200 p-3">
                  <dt className="text-slate-800">Lat</dt>
                  <dd className="font-medium text-slate-500">{typeof settings.lat === "number" ? settings.lat.toFixed(6) : "0.000000"}</dd>
                </div>
                <div className="rounded-lg bg-gray-200 p-3">
                  <dt className="text-slate-800">Lon</dt>
                  <dd className="font-medium text-slate-500">{typeof settings.lon === "number" ? settings.lon.toFixed(6) : "0.000000"}</dd>
                </div>
                <div className="rounded-lg bg-gray-200 p-3">
                  <dt className="text-slate-800">Stadt</dt>
                  <dd className="font-medium text-slate-500">{settings.town || "Unbekannt"}</dd>
                </div>
                <div className="rounded-lg bg-gray-200 p-3">
                  <dt className="text-slate-800">Landkreis</dt>
                  <dd className="font-medium text-slate-500">{settings.county || "Unbekannt"}</dd>
                </div>
                <div className="rounded-lg bg-gray-200 p-3">
                  <dt className="text-slate-800">Bundesland</dt>
                  <dd className="font-medium text-slate-500">{settings.state || "Unbekannt"}</dd>
                </div>
                <div className="rounded-lg bg-gray-200 p-3">
                  <dt className="text-slate-800">Land</dt>
                  <dd className="font-medium text-slate-500">{settings.country || "Unbekannt"}</dd>
                </div>
                <div className="rounded-lg bg-gray-200 p-3">
                  <dt className="text-slate-800">Land Code</dt>
                  <dd className="font-medium text-slate-500">{settings.country_code || "Unbekannt"}</dd>
                </div>
              </dl>
            </article>

            {/* Settings */}
            <article className="w-100 h-100 flex flex-col gap-2 rounded-lg border border-slate-200 bg-white/80 p-4 shadow-md">
              <div className="bg-gray-200 rounded-lg">
                <h2 className=" text-center text-lg font-semibold  text-slate-800">Einstellungen</h2>
              </div>

              <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-4">
                <div className="bg-gray-200 rounded-lg p-3">
                  <dt className="text-slate-800">EVT</dt>
                  <dd className="font-medium text-slate-500">{String(userSettings.evt) || "Unbekannt"}</dd>
                </div>

                <div className="rounded-lg bg-gray-200 p-3">
                  <dt className="text-slate-800">WEA</dt>
                  <dd className="font-medium text-slate-500">{String(userSettings.wea) || "Unbekannt"}</dd>
                </div>

                <div className="rounded-lg bg-gray-200 p-3">
                  <dt className="text-slate-800">MTX</dt>
                  <dd className="font-medium text-slate-500">{String(userSettings.mtx) || "Unbekannt"}</dd>
                </div>

                <div className="rounded-lg bg-gray-200 p-3">
                  <dt className="text-slate-800">RTC</dt>
                  <dd className="font-medium text-slate-500">{String(userSettings.rtc) || "Unbekannt"}</dd>
                </div>
              </dl>
              <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <div className="rounded-lg bg-gray-200 p-3">
                  <dt className="text-slate-800">Sensor Indoor</dt>
                  <dd className="font-medium text-slate-500">{String(settings.s_indoor) || "Unbekannt"}</dd>
                </div>

                <div className="rounded-lg bg-gray-200 p-3">
                  <dt className="text-slate-800">Sensor Outdoor</dt>
                  <dd className="font-medium text-slate-500">{String(settings.s_outdoor) || "Unbekannt"}</dd>
                </div>
              </dl>
              <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                <div className="rounded-lg bg-gray-200 p-3">
                  <dt className="text-slate-800">Temperatur Offset</dt>
                  <dd className="font-medium text-slate-500">{typeof settings.s_cal_temp === "number" ? settings.s_cal_temp.toFixed(2) : "-"}</dd>
                </div>

                <div className="rounded-lg bg-gray-200 p-3">
                  <dt className="text-slate-800">Feuchte Offset</dt>
                  <dd className="font-medium text-slate-500">{typeof settings.s_cal_humidity === "number" ? settings.s_cal_humidity.toFixed(2) : "-"}</dd>
                </div>

                <div className="rounded-lg bg-gray-200 p-3">
                  <dt className="text-slate-800">Druck Offset</dt>
                  <dd className="font-medium text-slate-500">{typeof settings.s_cal_pressure === "number" ? settings.s_cal_pressure.toFixed(2) : "-"}</dd>
                </div>
              </dl>
            </article>

            {/* Event-URLs */}
            <article className="w-100 h-100 rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-md">
              <h2 className="bg-gray-200 rounded-lg text-center text-lg font-semibold text-slate-800">Event-URLs</h2>

              <div className="my-2 p-2 w-full bg-gray-200 rounded-lg flex flex-row items-center justify-between ">
                <button
                  type="button"
                  className="px-2 py-2 w-full rounded-lg border border-gray-300 bg-gray-100 text-center text-sm transition hover:bg-gray-50"
                  onClick={() =>
                    setSettings((prev) => ({
                      ...prev,
                      event_refresh_interval: getNextEventRefreshInterval(
                        prev.event_refresh_interval
                      ),
                    }))
                  }
                  title="Klicken, um zwischen Taeglich, Woechentlich und Monatlich zu wechseln"
                >
                  <span>
                    Refresh für die Standard-Events: {getEventRefreshIntervalLabel(settings.event_refresh_interval)}
                  </span>
                </button>
              </div>

              <div className="w-full p-2  bg-gray-200 rounded-lg">
                <div className="bg-gray-300 p-2 rounded-lg flex flex-col gap-2 ">
                  <div>
                    <input
                      type="url"
                      className="px-2 py-1 w-full bg-gray-100 rounded border text-sm border-gray-300"
                      placeholder="https://website-of-events.com/"
                      value={urlInput}
                      onChange={e => setUrlInput(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") handleAddUrl(); }}
                    />
                  </div>
                  <div className="flex flex-row justify-between">
                    <div>
                      <button
                        type="button"
                        className="w-full rounded-lg border border-gray-300 bg-gray-200 px-2 py-2 text-center text-sm transition hover:bg-gray-100"
                        onClick={() =>
                          setUrlRefreshInterval((current) =>
                            getNextEventRefreshInterval(current)
                          )
                        }
                        title="Klicken, um zwischen Taeglich, Woechentlich und Monatlich zu wechseln"
                      >
                        {getEventRefreshIntervalLabel(urlRefreshInterval)}
                      </button>
                    </div>

                    <div className="flex justify-center">
                      <button
                        type="button"
                        className="px-4 py-1 bg-amber-600 text-white rounded hover:bg-amber-700"
                        onClick={handleAddUrl}
                        disabled={!urlInput.trim()}
                      >
                        Hinzufügen
                      </button>
                    </div>

                  </div>
                </div>
              </div>

              <div className="mb-1 mt-1 flex flex-wrap justify-between items-center gap-2 text-sm">
                <label className="font-medium">Event URLs:</label>
                <div className="p-1 rounded-lg border border-gray-300 flex flex-row gap-2">
                <span className="w-20 text-center rounded-lg bg-green-100 py-1 text-xs">Täglich</span>
                <span className="w-20 text-center rounded-lg bg-blue-100 py-1 text-xs">Wöchentlich</span>
                <span className="w-20 text-center rounded-lg bg-red-100 py-1 text-xs">Monatlich</span>
                </div>
              </div>

              <ul>
                {Array.isArray(settings.event_urls) && settings.event_urls.length > 0
                  ? settings.event_urls.map((entry, idx) => (
                    <li
                      key={idx}
                      className={`${getEventRefreshIntervalClasses(entry.refreshInterval)} mb-2 rounded-lg px-3 py-1 text-sm transition cursor-pointer`}
                      title={`${getEventRefreshIntervalLabel(entry.refreshInterval)} - Klick zum Wechseln, Doppelklick zum Loeschen`}
                      onClick={() =>
                        handleUrlRefreshChange(
                          entry.url,
                          getNextEventRefreshInterval(entry.refreshInterval)
                        )
                      }
                      onDoubleClick={() => handleRemoveUrl(entry.url)}
                    >
                      <div className="break-all">
                        {entry.url}
                      </div>
                    </li>
                  ))
                  : <li className="text-sm">Keine Event-URLs</li>
                }
              </ul>
            </article>

            {/* Sensors */}
            <article className="w-100 h-100 rounded-lg flex flex-col gap-2 border border-slate-200 bg-white/80 p-4 shadow-md">
              <div className="flex flex-row justify-between gap-2">
                <label className="bg-gray-200 p-1 text-sm rounded-lg flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.s_indoor}
                    onChange={e =>
                      setSettings(prev => ({
                        ...prev,
                        s_indoor: e.target.checked
                      }))
                    }
                  />
                  Sensor Innen aktivieren
                </label>

                <label className="bg-gray-200 p-1 text-sm rounded-lg flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={settings.s_outdoor}
                    onChange={e =>
                      setSettings(prev => ({
                        ...prev,
                        s_outdoor: e.target.checked
                      }))
                    }
                  />
                  Sensor Außen aktivieren
                </label>
              </div>

              {/* Anzeige Indoor */}
              {settings.s_indoor && (
                <div
                  className={`w-full rounded-lg shadow-sm transition-all duration-500 border-4 ${sensorValues.indoorStatus === "offline" ? "border-red-600 bg-red-100" : "bg-gray-200 border-transparent"
                    }`}
                >
                  <div className="flex justify-between items-center">
                    <p className="font-bold text-sm">Sensor Innen</p>
                    {sensorValues.indoorStatus === "offline" && (
                      <span className="mr-1 text-red-600 font-black text-sm">OFFLINE</span>
                    )}
                  </div>

                  {sensorValues.indoor ? (
                    <div className={sensorValues.indoorStatus === "offline" ? "opacity-40" : ""}>
                      <p className="text-sm">Temperatur: {sensorValues.indoor.temp?.toFixed(1)} °C</p>
                      {sensorValues.indoor.dew !== undefined && <p className="text-sm">Taupunkt: {sensorValues.indoor.dew?.toFixed(1)} °C</p>}
                      <p className="text-sm">Luftfeuchtigkeit: {sensorValues.indoor.hum?.toFixed(1)} %</p>
                      <p className="text-sm">Luftdruck: {sensorValues.indoor.pres?.toFixed(1)} hPa</p>
                    </div>
                  ) : (
                    <p className="text-sm">Warte auf Innensensor...</p>
                  )}
                </div>
              )}

              {/* Anzeige Outdoor */}
              {settings.s_outdoor && (
                <div
                  className={` w-full rounded-lg shadow-sm transition-all duration-500 border-4 ${sensorValues.outdoorStatus === "offline" ? "border-red-600 bg-red-100" : "bg-gray-200 border-transparent"
                    }`}
                >
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-sm">Sensor Außen</h4>
                    {sensorValues.outdoorStatus === "offline" && (
                      <span className="mr-1 text-red-600 font-black text-sm">OFFLINE</span>
                    )}
                  </div>

                  {sensorValues.outdoor ? (
                    <div className={sensorValues.outdoorStatus === "offline" ? "opacity-40" : ""}>
                      <p className="text-sm">Temperatur: {sensorValues.outdoor.temp?.toFixed(1)} °C</p>
                      {sensorValues.outdoor.dew !== undefined && <p className="text-sm">Taupunkt: {sensorValues.outdoor.dew?.toFixed(1)} °C</p>}
                      <p className="text-sm">Luftfeuchtigkeit: {sensorValues.outdoor.hum?.toFixed(1)} %</p>
                      <p className="text-sm">Luftdruck: {sensorValues.outdoor.pres?.toFixed(1)} hPa</p>
                    </div>
                  ) : (
                    <p className="text-sm">Warte auf Außensensor...</p>
                  )}
                </div>
              )}

              <div className="bg-gray-200">
                <p className="text-sm">Beachte, für die Offset Berechnung müssen beide Sensoren online und in der selben Umgebung sein.</p>
              </div>

              {/* Button Calculate Offset */}
              {settings.s_outdoor && settings.s_indoor && (
                <div className="flex flex-col items-center">
                  <button
                    type="button"
                    className="mt-2 px-4 py-1 bg-amber-600 text-white rounded hover:bg-amber-700"
                    onClick={handleCalculateOffset}
                    disabled={
                      !(
                        sensorValues.indoor &&
                        sensorValues.outdoor &&
                        sensorValues.indoorStatus === "online" &&
                        sensorValues.outdoorStatus === "online"
                      )
                    }
                  >
                    Offset berechnen
                  </button>
                </div>
              )}
            </article>

            {/* Sensor channel data */}
            <article className="w-100 h-100 rounded-lg flex flex-col gap-2 border border-slate-200 bg-white/80 p-4 shadow-md">
              <div className="h-full rounded-lg text-sm bg-gray-200 p-3">
                <dt>Bitte verwende beim Senden deiner Sensordaten vom BM280 die folgenden Kanäle</dt>
                <dt className="mt-1">Innensensor</dt>
                <dd className="opacity-70 text-slate-800 select-text">
                  {settings.user_id + "/in/climate" || "Unbekannt"}
                </dd>
                <dd className="opacity-70 text-slate-800 select-text">
                  {settings.user_id + "/in/stat" || "Unbekannt"}
                </dd>
                <dt className="mt-1">Außensensor</dt>
                <dd className="opacity-70 text-slate-800 select-text">
                  {settings.user_id + "/out/climate" || "Unbekannt"}
                </dd>
                <dd className="opacity-70 text-slate-800 select-text">
                  {settings.user_id + "/out/stat" || "Unbekannt"}
                </dd>
                <p className="mt-5">Hier findest du den BME280 Code zum Download.</p>
                <a
                  href="/bme280_code.ino"
                  download
                  className="mt-2 inline-block px-4 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 transition"
                >
                  Sensor BM280
                </a>
                <p className="mt-5">Die Verwendung der Sensoren mit Sentra erfordert einen MQTT Proxy. Eine Anleitung findest du in der README.</p>
              </div>
            </article>

            {/* Key Input */}
            <article className="w-100 h-100 p-4 rounded-lg flex flex-col gap-2 border border-slate-200 bg-white/80 shadow-md">
              <div className="p-3 h-full grid grid-cols-1 gap-2 rounded-lg text-sm bg-gray-200">
                <div className="p-1 rounded-lg flex flex-col bg-gray-300">
                  <label htmlFor="input1" className="text-sm text-slate-700">SERPAPI_KEY</label>
                  <input
                    id="input1"
                    type="text"
                    className="px-2 py-1 bg-gray-100 rounded border text-sm border-gray-300"
                    value={keyInputs.key1 ?? ""}
                    onChange={(e) => handleKeyChange("key1", e.target.value)}
                    placeholder={getKeyPlaceholder(settings.key1)}
                    autoComplete="off"
                  />
                </div>
                <div className="p-1 rounded-lg flex flex-col bg-gray-300">
                  <label htmlFor="input2" className="text-sm text-slate-700">OPENAI_API_KEY</label>
                  <input
                    id="input2"
                    type="text"
                    className="px-2 py-1 bg-gray-100 rounded border text-sm border-gray-300"
                    value={keyInputs.key2 ?? ""}
                    onChange={(e) => handleKeyChange("key2", e.target.value)}
                    placeholder={getKeyPlaceholder(settings.key2)}
                    autoComplete="off"
                  />
                </div>
                <div className="p-1 rounded-lg flex flex-col bg-gray-300">
                  <label htmlFor="input3" className="text-sm text-slate-700">CLOUDINARY_API_SECRET</label>
                  <input
                    id="input3"
                    type="text"
                    className="px-2 py-1 bg-gray-100 rounded border text-sm border-gray-300"
                    value={keyInputs.key3 ?? ""}
                    onChange={(e) => handleKeyChange("key3", e.target.value)}
                    placeholder={getKeyPlaceholder(settings.key3)}
                    autoComplete="off"
                  />
                </div>
                <div className="p-1 rounded-lg flex flex-col bg-gray-300">
                  <label htmlFor="input4" className="text-sm text-slate-700">CLOUDINARY_API_KEY</label>
                  <input
                    id="input4"
                    type="text"
                    className="px-2 py-1 bg-gray-100 rounded border text-sm border-gray-300"
                    value={keyInputs.key4 ?? ""}
                    onChange={(e) => handleKeyChange("key4", e.target.value)}
                    placeholder={getKeyPlaceholder(settings.key4)}
                    autoComplete="off"
                  />
                </div>
                <div className="p-1 rounded-lg flex flex-col bg-gray-300">
                  <label htmlFor="input5" className="text-sm text-slate-700">CLOUDINARY_CLOUD_NAME</label>
                  <input
                    id="input5"
                    type="text"
                    className="px-2 py-1 bg-gray-100 rounded border text-sm border-gray-300"
                    value={keyInputs.key5 ?? ""}
                    onChange={(e) => handleKeyChange("key5", e.target.value)}
                    placeholder={getKeyPlaceholder(settings.key5)}
                    autoComplete="off"
                  />
                </div>
              </div>
            </article>

            {/* Global Data und Save Button */}
            <article
              className={`w-100 h-100 rounded-lg flex flex-col gap-2 border bg-white/80 p-4 shadow-md
    ${borderColor === "green" ? "border-green-600" : borderColor === "red" ? "border-red-600" : "border-slate-200"}
    transition-colors duration-300`}
            >
              <div className="rounded-lg text-sm bg-gray-200 p-3">
                <p>Drücke den Button zum Speichern aller nutzerspezifischen Daten.</p>
              </div>


              <button
                type="submit"
                className={`mt-1 px-6 py-1 rounded bg-amber-600 text-white shadow hover:bg-amber-700 transition
                  ${saving ? "opacity-50 pointer-events-none" : ""}
                  ${borderColor === "green"
                    ? "border-3 border-green-600"
                    : borderColor === "red"
                      ? "border-3 border-red-600"
                      : hasUnsavedChanges()
                        ? "border-3 border-blue-500"
                        : "border-3 border-white"
                  }
                     transition-colors duration-300
                `}
                disabled={saving}
              >
                {saving ? "Speichere..." : "Speichern"}
              </button>
            </article>
          </div>
        </form>
      </MoveableScrollAreaVertical >
    </div >
  );
}



