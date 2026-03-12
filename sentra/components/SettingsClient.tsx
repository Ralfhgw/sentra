"use client";
import { Settings, SettingsClientProps } from "@/types/typesSettings";
import { useState } from "react";
import dynamic from "next/dynamic";
import { useSettings } from "@/context/SettingsContext";
import { MoveableScrollAreaVertical } from "@/components/CompMovableScrollAreaVertical"
/* import "leaflet/dist/leaflet.css"; */
const MapSelector = dynamic(() => import("@/components/CompMapSelector"), { ssr: false });


export default function SettingsClient({ initialSettings }: SettingsClientProps) {

  const { settings: userSettings } = useSettings();
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [error, setError] = useState<string>("");

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
    s_cal_temp: userSettings.s_cal_temp ?? initialSettings.s_cal_temp,
    s_cal_humidity: userSettings.s_cal_humidity ?? initialSettings.s_cal_humidity,
    s_cal_pressure: userSettings.s_cal_pressure ?? initialSettings.s_cal_pressure,
  });

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
          <div className="flex flex-row gap-6 items-center">
            {/* MapSelector */}
            <div className="w-full flex flex-col items-center">
              <label className="font-semibold mb-2">Neue Standortwahl mit Klick in Karte:</label>
              <div className="w-100 h-100 rounded-lg overflow-hidden border border-gray-300 shadow-sm bg-red-100">
                <MapSelector
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
                />
              </div>
            </div>

            {/* InfoBox */}
            <div className="text-center text-sm bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200">
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
              <b>Land:</b> {settings.country || "Unbekannt"}
            
            <b>Event-URLs:</b>
            <ul>
              {Array.isArray(userSettings.event_urls) && userSettings.event_urls.length > 0
                ? userSettings.event_urls.map((entry, idx) => (
                  <li key={idx}>{entry.url}</li>
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
            <b>Sensor Kalibrierung Temperatur:</b> {String(userSettings.s_cal_temp)}<br />
            <b>Sensor Kalibrierung Feuchte:</b> {String(userSettings.s_cal_humidity)}<br />
            <b>Sensor Kalibrierung Druck:</b> {String(userSettings.s_cal_pressure)}<br />
          </div>
          </div>



          <div className="w-full max-w-xl mt-6">
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

            
            <div className="mt-3">
              <span className="font-semibold">Konfigurierte URLs (Löschen mit Klick auf Link):</span>
              <ul className="list-disc list-inside mt-1">
                {/*                 {urls.map((url, idx) => (
                  <li
                    key={idx}
                    className={`break-all ${url !== DEFAULT_URL ? "cursor-pointer hover:text-red-600" : "text-gray-400"}`}
                    title={url !== DEFAULT_URL ? "Klicken zum Löschen" : "Standard-URL kann nicht gelöscht werden"}
                    onClick={
                      url !== DEFAULT_URL
                        ? async () => {
                          const newUrls = urls.filter(u => u !== url);
                          setUrls(newUrls);
                          if (typeof saveEventUrls === "function") {
                            await saveEventUrls(newUrls);
                          }
                        }
                        : undefined
                    }
                    style={url === DEFAULT_URL ? { pointerEvents: "none" } : {}}
                  >
                    {url}
                  </li>
                ))} */}
              </ul>
            </div>
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