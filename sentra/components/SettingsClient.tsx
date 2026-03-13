"use client";
import { Settings, SettingsClientProps } from "@/types/typesSettings";
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

export default function SettingsClient({ initialSettings }: SettingsClientProps) {

  const { settings: userSettings } = useSettings();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [error, setError] = useState<string>("");
  const [sensorValues, setSensorValues] = useState<DualSensorState>({ indoor: null, outdoor: null });
  const [calTemp, setCalTemp] = useState<number | null>(null);
  const [calHumidity, setCalHumidity] = useState<number | null>(null);
  const [calPressure, setCalPressure] = useState<number | null>(null);

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
            try { newSensorData.indoor = JSON.parse(result.wert.indoor); } catch (e) { console.error("Parse Error Indoor", e); }
          }
          if (result.wert.outdoor) {
            try { newSensorData.outdoor = JSON.parse(result.wert.outdoor); } catch (e) { console.error("Parse Error Outdoor", e); }
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
      setCalTemp(offsetTemp);

      // Luftfeuchtigkeit
      const avgHum = (sensorValues.indoor.hum + sensorValues.outdoor.hum) / 2;
      const offsetHum = Math.round((sensorValues.indoor.hum - avgHum) * 1000) / 1000;
      setCalHumidity(offsetHum);

      // Luftdruck
      const avgPres = (sensorValues.indoor.pres + sensorValues.outdoor.pres) / 2;
      const offsetPres = Math.round((sensorValues.indoor.pres - avgPres) * 1000) / 1000;
      setCalPressure(offsetPres);

      setSettings(prev => ({
        ...prev,
        s_cal_temp: offsetTemp,
        s_cal_humidity: offsetHum,
        s_cal_pressure: offsetPres
      }));
    }
  };

  console.log("User Settings:", userSettings);
  console.log("Lang:", userSettings.lang);
  console.log("Lat:", userSettings.lat);
  console.log("Lon:", userSettings.lon);
  console.log("DisplayName:", userSettings.displayName);
  console.log("Town:", userSettings.town);
  console.log("County:", userSettings.county);
  console.log("State:", userSettings.state);
  console.log("Country:", userSettings.country);
  console.log("CountryCode:", userSettings.country_code);
  console.log("Channels:", userSettings.channels);
  console.log("EVT:", userSettings.evt);
  console.log("wea:", userSettings.wea);
  console.log("mtx:", userSettings.mtx);
  console.log("rtc:", userSettings.rtc);
  console.log("sIndoor:", userSettings.s_indoor);
  console.log("sOutdoor:", userSettings.s_outdoor);
  console.log("sCalTemp:", userSettings.s_cal_temp);
  console.log("sCalHumidity:", userSettings.s_cal_humidity);
  console.log("sCalPressure:", userSettings.s_cal_pressure);

  const [settings, setSettings] = useState<Settings>({
    ...initialSettings,
    lat: userSettings.lat,
    lon: userSettings.lon,
    display_name: userSettings.displayName,
    town: userSettings.town,
    county: userSettings.county,
    state: userSettings.state,
    country: userSettings.country,
    country_code: userSettings.country_code,
    channels: Array.isArray(userSettings.channels)
      ? userSettings.channels
        .filter((channel) => channel && typeof channel === "object" && "url" in channel)
        .map((channel) => channel.url)
      : [],
    event_urls: userSettings.event_urls.map((entry) => entry.url),
    evt: userSettings.evt,
    wea: userSettings.wea,
    mtx: userSettings.mtx,
    rtc: userSettings.rtc,
    s_indoor: userSettings.s_indoor,
    s_outdoor: userSettings.s_outdoor,
s_cal_temp: typeof userSettings.s_cal_temp === "number"
  ? userSettings.s_cal_temp
  : Number(initialSettings.s_cal_temp),
s_cal_humidity: typeof userSettings.s_cal_humidity === "number"
  ? userSettings.s_cal_humidity
  : Number(initialSettings.s_cal_humidity),
s_cal_pressure: typeof userSettings.s_cal_pressure === "number"
  ? userSettings.s_cal_pressure
  : Number(initialSettings.s_cal_pressure),
  });

  const [urlInput, setUrlInput] = useState("");
  const [urls, setUrls] = useState<string[]>(
    Array.isArray(userSettings.event_urls) ? userSettings.event_urls.map(e => e.url) : []
  );

  const handleAddUrl = () => {
    if (urlInput.trim() && !urls.includes(urlInput.trim())) {
      setUrls([...urls, urlInput.trim()]);
      setUrlInput("");
    }
  };

  const handleRemoveUrl = (url: string) => {
    setUrls(urls.filter(u => u !== url));
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setStatus("idle");
    try {
      const response = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!response.ok) throw new Error("Fehler beim Speichern!");
      setStatus("success");
    } catch (e: unknown) {
      if (e instanceof Error) {
        console.error("Fehler beim Abrufen der Standortdaten:", e.message);
      } else {
        console.error("Fehler beim Abrufen der Standortdaten:", e);
      }
      setError("Standortdaten konnten nicht geladen werden.");
      setStatus("error");
    } finally {
      setSaving(false);
    }
  };

  async function fetchLocationData(lat: number, lon: number) {
    const res = await fetch(`api/settings/reverseGeoCode?lat=${lat}&lon=${lon}`);
    if (!res.ok) throw new Error("Fehler beim Abrufen der Standortdaten");
    return res.json();
  }

  return (
    <div className="flex flex-col lg:flex-row gap-1 w-full h-full mx-auto overflow-x-hidden min-w-0">
      <MoveableScrollAreaVertical className="flex-1 min-w-0 box-border w-screen lg:w-[calc(100vw-100px)] h-dvh lg:h-[calc(100dvh-100px)] overflow-x-hidden bg-gray-200 text-gray-800 lg:p-4 no-scrollbar shadow-md cursor-grab select-none">
        <h1 className="text-[30px] mb-6 text-center font-bold">Einstellungen</h1>

        <form
          onSubmit={e => {
            e.preventDefault();
            handleSave();
          }}
        >
          <div className="flex flex-row items-center">
            {/* MapSelector */}
            <div className="bg-red-300 flex flex-col items-center">
              <label className="font-semibold">Neue Standortwahl mit Klick in Karte:</label>
              <div className="w-100 h-100 rounded-lg overflow-hidden border border-gray-300 shadow-sm">
                {/*       <MapSelector
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
            </div>

            {/* InfoBox */}
            <div className="bg-blue-300 text-left text-sm rounded-lg shadow-sm border border-gray-200">
              <b>Lat:</b>{" "}
              {typeof settings.lat === "number"
                ? settings.lat.toFixed(6)
                : "0.000000"}
              <br />
              <b>Lon:</b>{" "}
              {typeof settings.lon === "number"
                ? settings.lon.toFixed(6)
                : "0.000000"}
              <br />
              <b>Stadt:</b> {settings.town || "Unbekannt"}
              <br />
              <b>Landkreis:</b> {settings.county || "Unbekannt"}
              <br />
              <b>Bundesland:</b> {settings.state || "Unbekannt"}
              <br />
              <b>Land:</b> {settings.country || "Unbekannt"}<br />

              <b>Event-URLs:</b>
              <ul>
                {urls.length > 0
                  ? urls.map((url, idx) => (
                    <li
                      key={idx}
                      className="break-all cursor-pointer hover:text-red-600"
                      title="Klicken zum Löschen"
                      onClick={() => handleRemoveUrl(url)}
                    >
                      {url}
                    </li>
                  ))
                  : <li>Keine Event-URLs</li>
                }
              </ul>
              <b>EVT:</b> {String(userSettings.evt)}<br />
              <b>WEA:</b> {String(userSettings.wea)}<br />
              <b>MTX:</b> {String(userSettings.mtx)}<br />
              <b>RTC:</b> {String(userSettings.rtc)}<br />
              <b>Sensor Indoor:</b> {String(userSettings.s_indoor)}<br />
              <b>Sensor Outdoor:</b> {String(userSettings.s_outdoor)}<br />
              <b>Temperatur Offset:</b> {typeof settings.s_cal_temp === "number" ? settings.s_cal_temp.toFixed(2) : "-"}<br />
              <b>Feuchte Offset:</b> {typeof settings.s_cal_humidity === "number" ? settings.s_cal_humidity.toFixed(2) : "-"}<br />
              <b>Druck Offset:</b> {typeof settings.s_cal_pressure === "number" ? settings.s_cal_pressure.toFixed(2) : "-"}<br />
            </div>
          </div>

          {/* EventsURLs */}
          <div className="bg-green-300 w-full max-w-xl">
            <h1 className="font-semibold text-2xl">Eventportale</h1>
            <label className="block font-semibold mb-1">Weitere API-URLs hinzufügen:</label>
            <div className="flex gap-2">
              <input
                type="url"
                className="flex-1 border border-gray-300 rounded px-2 py-1"
                placeholder="https://example.com/api"
                value={urlInput}
                onChange={e => setUrlInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleAddUrl(); }}
              />
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

          {/* Anzeige Indoor */}
          <div
            className={`bg-red-300 w-90 shadow-sm transition-all duration-500 border-4 ${sensorValues.indoorStatus === "offline" ? "border-red-600 bg-red-100" : "border-transparent"
              }`}
          >
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-lg">Sensor Innen</h4>
              {sensorValues.indoorStatus === "offline" && (
                <span className="text-red-600 font-black text-xs">OFFLINE</span>
              )}
            </div>

            {sensorValues.indoor ? (
              <div className={sensorValues.indoorStatus === "offline" ? "opacity-40" : ""}>
                <p><strong>Temperatur:</strong> {sensorValues.indoor.temp?.toFixed(1)} °C</p>
                {sensorValues.indoor.dew !== undefined && <p><strong>Taupunkt:</strong> {sensorValues.indoor.dew?.toFixed(1)} °C</p>}
                <p><strong>Luftfeuchtigkeit:</strong> {sensorValues.indoor.hum?.toFixed(1)} %</p>
                <p><strong>Luftdruck:</strong> {sensorValues.indoor.pres?.toFixed(1)} hPa</p>
              </div>
            ) : (
              <p>Warte auf Innensensor...</p>
            )}
          </div>
          {/* Anzeige Outdoor */}
          <div
            className={`bg-yellow-300 w-90 shadow-sm transition-all duration-500 border-4 ${sensorValues.outdoorStatus === "offline" ? "border-red-600 bg-red-100" : "bg-white/30 border-transparent"
              }`}
          >
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-lg">Sensor Außen</h4>
              {sensorValues.outdoorStatus === "offline" && (
                <span className="text-red-600 font-black text-xs">OFFLINE</span>
              )}
            </div>

            {sensorValues.outdoor ? (
              <div className={sensorValues.outdoorStatus === "offline" ? "opacity-40" : ""}>
                <p><strong>Temperatur:</strong> {sensorValues.outdoor.temp?.toFixed(1)} °C</p>
                {sensorValues.outdoor.dew !== undefined && <p><strong>Taupunkt:</strong> {sensorValues.outdoor.dew?.toFixed(1)} °C</p>}
                <p><strong>Luftfeuchtigkeit:</strong> {sensorValues.outdoor.hum?.toFixed(1)} %</p>
                <p><strong>Luftdruck:</strong> {sensorValues.outdoor.pres?.toFixed(1)} hPa</p>
              </div>
            ) : (
              <p>Warte auf Außensensor...</p>
            )}
          </div>

          <div className="flex flex-col items-center">
            <button
              type="button"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
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

          <button
            type="submit"
            className={`mt-4 px-6 py-2 rounded bg-amber-600 text-white 
                font-bold shadow hover:bg-amber-700 transition ${saving ? "opacity-50 pointer-events-none" : ""}`} disabled={saving}
          >
            {saving ? "Speichere..." : "Speichern"}
          </button>
          {status === "success" && (
            <div className="text-green-600 font-semibold mt-2">Erfolgreich gespeichert!</div>
          )}
          {status === "error" && (
            <div className="text-red-600 font-semibold mt-2">{error}</div>
          )}


        </form>


      </MoveableScrollAreaVertical >
    </div >
  );
}