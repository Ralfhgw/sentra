"use client";
import { Thermometer, Hygrometer, Compass, Barometer } from "@/app/weather/Instruments";
import { useState, useEffect, useMemo } from "react";
import { WeatherClientProps, weatherDataCurrent } from "@/types/typesWeather";
import 'weather-icons/css/weather-icons.min.css';
import WeatherIcon from "@/app/weather/WeatherIcons";
import { MoveableScrollAreaVertical } from "@/components/CompMovableScrollAreaVertical"
import MoveableScrollAreaHorizontal from "@/components/CompMovableScrollAreaHorizontal"
import ChartTemperature from "@/app/weather/chartTemperature";
import ChartWind from "@/app/weather/chartWind";
import ChartPrecipitation from "@/app/weather/chartPrecipitation";
import ChartTranspiration from "@/app/weather/chartTranspiration";
import ChartAtmosphere from "@/app/weather/chartAtmosphere"
import ModuleDisabledNotice from "@/components/ModuleDisabledNotice";

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

// Hilfsfunktionen (außerhalb oder innerhalb der Komponente definieren)
const clamp = (value: number, min = 0, max = 1) =>
  Math.min(max, Math.max(min, value));

const mix = (from: number, to: number, t: number) =>
  Math.round(from + (to - from) * t);

const mixColor = (
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  t: number
): [number, number, number] => [
    mix(from[0], to[0], t),
    mix(from[1], to[1], t),
    mix(from[2], to[2], t),
  ];

export default function WeatherClient({
  weaEnabled,
  weatherDataCurrent,
  weatherDataHourly,
  weatherDataDaily,
  elevation,
  town,
  s_cal_temp,
  s_cal_humidity,
  s_cal_pressure,
}: WeatherClientProps) {
  console.log("WeatherClient Elevation:", elevation);

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  // Sensordata

  const [sensorValues, setSensorValues] = useState<DualSensorState>({ indoor: null, outdoor: null });

  const dailyArray = useMemo(() => {
    return weatherDataDaily?.time
      ? weatherDataDaily.time.map((date: Date, idx: number) => ({
        date,
        weather_code: weatherDataDaily.weather_code?.[idx],
        temperature_2m_max: weatherDataDaily.temperature_2m_max?.[idx],
        temperature_2m_min: weatherDataDaily.temperature_2m_min?.[idx],
        apparent_temperature_max:
          weatherDataDaily.apparent_temperature_max?.[idx],
        apparent_temperature_min:
          weatherDataDaily.apparent_temperature_min?.[idx],
        wind_speed_10m_max: weatherDataDaily.wind_speed_10m_max?.[idx],
        wind_gusts_10m_max: weatherDataDaily.wind_gusts_10m_max?.[idx],
        wind_direction_10m_dominant:
          weatherDataDaily.wind_direction_10m_dominant?.[idx],
        precipitation_sum: weatherDataDaily.precipitation_sum?.[idx],
        precipitation_hours: weatherDataDaily.precipitation_hours?.[idx],
        shortwave_radiation_sum:
          weatherDataDaily.shortwave_radiation_sum?.[idx],
        et0_fao_evapotranspiration:
          weatherDataDaily.et0_fao_evapotranspiration?.[idx],
        sunrise: weatherDataDaily.sunrise?.[idx],
        sunset: weatherDataDaily.sunset?.[idx],
      }))
      : [];
  }, [weatherDataDaily]);



  // Update MQTT data every 15 minutes
  useEffect(() => {
    if (!weaEnabled) {
      return;
    }

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
              console.log("calTemp:", s_cal_temp);
              console.log("calHumidity:", s_cal_humidity);
              console.log("calPressure:", s_cal_pressure);

              newSensorData.indoor = JSON.parse(result.wert.indoor);
/*            console.log("indoor.temp:",newSensorData.indoor.temp)
              console.log("indoor.dew:",newSensorData.indoor.dew)
              console.log("indoor.hum:",newSensorData.indoor.hum)
              console.log("indoor.pres:",newSensorData.indoor.pres) */
              if (newSensorData.indoor) {
                newSensorData.indoor.temp -= s_cal_temp;
                if (typeof newSensorData.indoor.dew === "number") newSensorData.indoor.dew -= s_cal_temp;
                newSensorData.indoor.hum -= s_cal_humidity;
                newSensorData.indoor.pres -= s_cal_pressure;
              }
            } catch (e) { console.error("Parse Error Indoor", e); }
          }
          if (result.wert.outdoor) {
            try {
              newSensorData.outdoor = JSON.parse(result.wert.outdoor);
/*               console.log("outdoor.temp:",newSensorData.outdoor.temp)
              console.log("outdoor.dew:",newSensorData.outdoor.dew)
              console.log("outdoor.hum:",newSensorData.outdoor.hum)
              console.log("outdoor.pres:",newSensorData.outdoor.pres) */
              if (newSensorData.outdoor) {
                newSensorData.outdoor.temp += s_cal_temp;
                if (typeof newSensorData.outdoor.dew === "number") newSensorData.outdoor.dew += s_cal_temp;
                newSensorData.outdoor.hum += s_cal_humidity;
                newSensorData.outdoor.pres -= s_cal_pressure;
              }
            } catch (e) { console.error("Parse Error Outdoor", e); }
          }

          setSensorValues(newSensorData);
        }
      } catch (error) {
        console.error("Fehler beim Laden der Sensordaten:", error);
      }
    }

    fetchSensorData();
    const intervalId = window.setInterval(fetchSensorData, 60 * 1000); // 1 Minute Intervall

    return () => window.clearInterval(intervalId);
  }, [weaEnabled, s_cal_temp, s_cal_humidity, s_cal_pressure]);

  useEffect(() => { }, [dailyArray]);

// Calculation BackgroundColor
  const skyBackground = useMemo(() => {
    const currentTimestamp = weatherDataCurrent?.time ?? null;
    const cloudCoverValue = typeof weatherDataCurrent?.cloud_cover === 'number'
      ? weatherDataCurrent.cloud_cover
      : 0;

    const nowDate = currentTimestamp ? new Date(currentTimestamp) : new Date();
    const today = dailyArray?.find((item) => new Date(item.date).toDateString() === nowDate.toDateString());

    // NACHT / FALLBACK
    if (!today?.sunrise || !today?.sunset) {
      return "linear-gradient(180deg, #020617 0%, #0f172a 100%)";
    }

    const now = nowDate.getTime();
    const sunrise = new Date(today.sunrise).getTime();
    const sunset = new Date(today.sunset).getTime();
    const cloudiness = clamp(cloudCoverValue / 100, 0, 1);

    if (now <= sunrise || now >= sunset) {
      return "linear-gradient(180deg, #020617 0%, #1e1b4b 100%)";
    }

    // TAG-LOGIK
    const daylightProgress = clamp((now - sunrise) / (sunset - sunrise), 0, 1);
    const sunHeight = Math.sin(daylightProgress * Math.PI);
    const sunX = 10 + daylightProgress * 80;
    const sunY = 80 - sunHeight * 60;

    // Farben [R, G, B]
    const sunCore: [number, number, number] = [253, 224, 71];   // Gelb
    const cloudCore: [number, number, number] = [209, 213, 219]; // Hellgrau
    const skyBlue: [number, number, number] = [14, 165, 233];    // Blau
    const skyGrey: [number, number, number] = [71, 85, 105];     // Slate-Grau

    const core = mixColor(sunCore, cloudCore, cloudiness);
    const atmosphere = mixColor(skyBlue, skyGrey, cloudiness);

    return `
    radial-gradient(circle at ${sunX}% ${sunY}%,
      rgba(${core[0]}, ${core[1]}, ${core[2]}, 1) 0%,
      rgba(${atmosphere[0]}, ${atmosphere[1]}, ${atmosphere[2]}, 0.8) 25%,
      rgba(${Math.max(0, atmosphere[0] - 40)}, ${Math.max(0, atmosphere[1] - 40)}, ${Math.max(0, atmosphere[2] - 40)}, 1) 100%
    )
  `;
  }, [weatherDataCurrent, dailyArray]);

  if (!weaEnabled) {
    return <ModuleDisabledNotice title="Weather" settingCode="WEA" />;
  }

  const isIndoorWarning =
    sensorValues.indoor !== null &&
    sensorValues.outdoor !== null &&
    typeof sensorValues.indoor.dew === "number" &&
    typeof sensorValues.outdoor.dew === "number" &&
    sensorValues.outdoor.dew < sensorValues.indoor.dew;

  const indoorSignalColor = (() => {
    const indoorDew = sensorValues.indoor?.dew;
    const outdoorDew = sensorValues.outdoor?.dew;

    if (typeof indoorDew !== "number" || typeof outdoorDew !== "number") {
      return "rgb(229, 231, 235)";
    }

    // 0..1 Intensität (ab 8°C Differenz volle Farbe)
    const diff = Math.abs(outdoorDew - indoorDew);
    const t = Math.min(diff / 12, 1);

    const from = { r: 229, g: 231, b: 235 }; // grau
    const to = isIndoorWarning
      ? { r: 220, g: 38, b: 38 }   // rot
      : { r: 22, g: 163, b: 74 };  // grün

    const lerp = (a: number, b: number, x: number) =>
      Math.round(a + (b - a) * x);

    return `rgb(${lerp(from.r, to.r, t)}, ${lerp(from.g, to.g, t)}, ${lerp(from.b, to.b, t)}, 0.3)`;
  })();

  // Current Data Set
  function getNumber(
    obj: weatherDataCurrent | null,
    key: keyof weatherDataCurrent
  ): number {
    if (obj && typeof obj[key] === "number") {
      return obj[key] as number;
    }
    return 0;
  }

  // Werte aus weatherDataCurrent extrahieren
  const c_temperature_2m = getNumber(weatherDataCurrent, "temperature_2m");
  const c_isDay = getNumber(weatherDataCurrent, "is_day") === 1;
  const c_windSpeed_10m = getNumber(weatherDataCurrent, "wind_speed_10m");
  const c_windDirection_10m = getNumber(weatherDataCurrent, "wind_direction_10m");
  const c_windGusts_10m = getNumber(weatherDataCurrent, "wind_gusts_10m");
  const c_relativeHumidity_2m = getNumber(weatherDataCurrent, "relative_humidity_2m");
  const c_weatherCode = getNumber(weatherDataCurrent, "weather_code");
  const c_apparentTemperature = getNumber(weatherDataCurrent, "apparent_temperature");
  const c_precipitation = getNumber(weatherDataCurrent, "precipitation");
  const c_cloudCover = getNumber(weatherDataCurrent, "cloud_cover");
  const c_surfacePressure = getNumber(weatherDataCurrent, "surface_pressure");
  console.log("Aktuelle Wetterdaten (Current):", {
    c_temperature_2m,
    c_isDay,
    c_windSpeed_10m,
    c_windDirection_10m,
    c_windGusts_10m,
    c_relativeHumidity_2m,
    c_weatherCode,
    c_apparentTemperature,
    c_precipitation,
    c_cloudCover,
    c_surfacePressure
  });

  return (

    <div className="flex flex-col lg:flex-row gap-1 w-full h-full mx-auto overflow-x-hidden min-w-0">
      <MoveableScrollAreaVertical className="flex-1 min-w-0 box-border w-screen lg:w-[calc(100vw-100px)] h-dvh lg:h-[calc(100dvh-100px)] overflow-x-hidden bg-gray-200 text-gray-800 lg:p-0 no-scrollbar shadow-md cursor-grab select-none">
        { /* Weather Instruments Monitor*/}
        <div className="hidden lg:flex relative w-full h-full rounded-xl overflow-hidden shadow-xl items-center justify-center" style={{ background: skyBackground }}>

          <div>
            <div className="w-full">
              <h1 className="bg-gray-300/40 py-4 rounded-xl text-xl font-bold text-center">Aktuelle Wetterdaten ({town})</h1>
            </div>

            <div className=" bg-gray-300/40 mt-4 p-2 rounded-xl flex flex-row gap-10 justify-center">

              <div className="flex justify-center items-center">
                <Thermometer temperature_2m={c_temperature_2m} apparentTemperature={c_apparentTemperature} />
              </div>
              <div className="flex flex-col gap-10 ">
                <div className="flex flex-row gap-10 justify-around">
                  <Compass
                    c_wind_direction_10m={c_windDirection_10m}
                    c_wind_speed_10m={c_windSpeed_10m}
                    c_wind_gusts_10m={c_windGusts_10m}
                  />
                  <Hygrometer humidity={c_relativeHumidity_2m} />
                  <Barometer pressure={c_surfacePressure} />
                </div>
                <div className="bg-gray-300/50 p-6 rounded-xl flex flex-col md:flex-row gap-10 justify-center">
                  <div className="bg-white/30 flex flex-col p-6 rounded-xl shadow-sm min-w-50">
                    <WeatherIcon code={c_weatherCode} isDay={c_isDay} size={75} />
                    <span className="text-gray-700 font-bold text-lg">
                      {Math.round(c_cloudCover)}% Bewölkung
                    </span>
                    <span className="text-gray-700 font-bold text-lg">
                      Höhe: {elevation} m ü. NN
                    </span>
                    <span className="text-gray-700 font-bold text-lg">
                      {Number(c_precipitation).toFixed(1)} mm Niederschlag
                    </span>
                  </div>

                  {/* Anzeige Indoor */}
                  <div
                    className={`p-4 rounded-xl shadow-sm min-w-50 transition-all duration-500 border-4 ${sensorValues.indoorStatus === "offline" ? "border-red-600 bg-red-100" : "border-transparent"
                      }`}
                    style={{ backgroundColor: sensorValues.indoorStatus === "online" ? indoorSignalColor : undefined }}
                  >
                    <div className="flex justify-between items-center mb-2">
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
                    className={`p-4 rounded-xl shadow-sm min-w-50 transition-all duration-500 border-4 ${sensorValues.outdoorStatus === "offline" ? "border-red-600 bg-red-100" : "bg-white/30 border-transparent"
                      }`}
                  >
                    <div className="flex justify-between items-center mb-2">
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
                </div>
              </div>
            </div>
          </div>
        </div>


        {/* Weather Instruments Mobile */}
        <div className="lg:hidden w-full bg-gray-200 p-3 shadow-xl flex flex-col md:flex-row items-center justify-center" style={{ background: skyBackground }}>
          <div>
            <section className="relative overflow-hidden rounded-[28px] border border-white/20 bg-slate-950/35 p-5 text-white backdrop-blur-xl shadow-[0_20px_60px_rgba(15,23,42,0.35)]">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_42%)]" />

              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.35em] text-white/70">
                    Wetterdaten
                  </p>

                  <div className="mt-3 flex items-end gap-2">
                    <span className="text-5xl font-black leading-none">
                      {c_temperature_2m.toFixed(1)}
                    </span>
                    <span className="pb-1 text-lg text-white/80">°C</span>
                  </div>

                  <p className="mt-2 text-sm text-white/80">
                    Gefühlt {c_apparentTemperature.toFixed(1)} °C
                  </p>
                </div>

                <div className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15">
                  <WeatherIcon code={c_weatherCode} isDay={c_isDay} size={72} />
                </div>
              </div>

              <div className="relative mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Wind</p>
                  <p className="mt-2 text-2xl font-bold">{Math.round(c_windSpeed_10m)} km/h</p>
                  <p className="text-sm text-white/70">Böen {Math.round(c_windGusts_10m)} km/h</p>
                </div>

                <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Richtung</p>
                  <p className="mt-2 text-2xl font-bold">{Math.round(c_windDirection_10m)}°</p>
                  <p className="text-sm text-white/70">
                    {["N", "NO", "O", "SO", "S", "SW", "W", "NW", "N"][Math.round(c_windDirection_10m / 45)]}
                  </p>
                </div>

                <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Himmel</p>
                  <p className="mt-2 text-2xl font-bold">{Math.round(c_cloudCover)}%</p>
                  <p className="text-sm text-white/70">Bewölkung</p>
                </div>

                <div className="rounded-2xl bg-black/20 p-3 ring-1 ring-white/10">
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Regen</p>
                  <p className="mt-2 text-2xl font-bold">{Number(c_precipitation).toFixed(1)} mm</p>
                  <p className="text-sm text-white/70">aktuell</p>
                </div>
              </div>

              <div className="relative mt-4 flex items-center justify-between rounded-2xl bg-white/10 px-4 py-3 ring-1 ring-white/15">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Standort</p>
                  <p className="mt-1 text-sm font-medium text-white/85">
                    Höhe: {elevation ?? "-"} m ü. NN
                  </p>
                </div>

                <div className="rounded-full bg-white/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
                  {c_isDay ? "Tag" : "Nacht"}
                </div>
              </div>
            </section>
          </div>
          <div className="m-4 flex flex-col gap-5">
            {/* Anzeige Indoor */}
            <div
              className={`p-4 rounded-xl shadow-sm min-w-50 transition-all duration-500 border-4 ${sensorValues.indoorStatus === "offline" ? "border-red-600 bg-red-100" : "border-transparent"
                }`}
              style={{ backgroundColor: sensorValues.indoorStatus === "online" ? indoorSignalColor : undefined }}
            >
              <div className="flex justify-between items-center mb-2">
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
              className={`p-4 rounded-xl shadow-sm min-w-50 transition-all duration-500 border-4 ${sensorValues.outdoorStatus === "offline" ? "border-red-600 bg-red-100" : "bg-white/30 border-transparent"
                }`}
            >
              <div className="flex justify-between items-center mb-2">
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
          </div>
        </div>
        <div>
          <h3 className="text-lg font-bold my-3 text-center">Tägliche Wetterprognose</h3>
        </div>
        <div className="p-4 space-y-3">
          <p>
            Dieser Chart vergleicht die objektiv messbare Lufttemperatur mit der gefühlten Temperatur. Letztere integriert Faktoren wie Windchill und Luftfeuchtigkeit, um die tatsächliche thermische Belastung auf den Organismus abzubilden. Die Gegenüberstellung verdeutlicht die energetische Differenz zwischen Messwert und subjektivem Wärmeempfinden.
          </p>
        </div>
        <ChartTemperature data={weatherDataHourly} />
        <div className="p-4 space-y-3">
          <p>
            Dieser Chart visualisiert die kinetische Energie der Atmosphäre. Während die Windgeschwindigkeit die stetige Luftmassenbewegung darstellt, erfassen die Böengeschwindigkeiten kurzzeitige Turbulenzen und Druckunterschiede. Zusammen mit der Windrichtung ermöglicht dies eine präzise Bewertung der aerodynamischen Lasten und Strömungsdynamik.
          </p>
        </div>
        <ChartWind data={weatherDataHourly} />
        <div className="p-4 space-y-3">
          <p>
            Dieser Chart visualisiert die hydrologische Dynamik der Atmosphäre. Die Balken geben die absolute Niederschlagsmenge in Millimetern an, während die Niederschlagswahrscheinlichkeit die statistische Sicherheit des Ereignisses basierend auf vergleichbaren Wetterlagen beschreibt. Ergänzt wird dies durch die relative Luftfeuchtigkeit, welche den aktuellen Wasserdampfgehalt im Verhältnis zur maximalen Sättigungskapazität der Luft bei gegebener Temperatur darstellt. Das Zusammenspiel dieser Parameter ermöglicht eine präzise Beurteilung von Kondensationsprozessen und der allgemeinen Feuchtebilanz
          </p>
        </div>
        <ChartPrecipitation data={weatherDataHourly} />
        <div className="p-4 space-y-3">
          <p>
            Dieser Chart visualisiert das Zusammenspiel von Wasserbedarf und Pflanzenstress. Während die <strong>ET0 (FAO-Methode)</strong> den maximalen theoretischen Wasserbedarf unter aktuellen Wetterbedingungen angibt, zeigt die <strong>Evapotranspiration</strong> die real modellierte Verdunstung von Boden und Pflanzen. Die Differenz dieser Werte verdeutlicht das aktuelle Defizit. Ergänzend misst der <strong>VPD (Vapour Pressure Deficit)</strong> die Saugkraft der Luft: Je höher dieser Wert in kPa, desto trockener ist die Luft und desto größer der Stress für die Pflanze. Die farbige <strong>Heatmap</strong> im Hintergrund dient dabei als direktes Signal – von optimalen Bedingungen (grün) bis hin zu hoher Stressbelastung (rot). Steigt der VPD stark an und bleibt die reale Verdunstung hinter der ET0 zurück, ist dies ein deutliches Zeichen für Trockenstress und notwendige Bewässerungsmaßnahmen.
          </p>
        </div>
        <ChartTranspiration data={weatherDataHourly} />
        <div className="p-4 space-y-3">
          <p>
            Dieser Chart stellt die optische Durchlässigkeit der Atmosphäre der großräumigen Druckverteilung gegenüber. Die Sichtweite gibt die maximale Distanz an, bei der dunkle Objekte vor hellem Hintergrund erkennbar sind – sie ist ein direktes Maß für die Partikelkonzentration und Luftreinheit. Der Luftdruck hingegen visualisiert das Gewicht der Luftsäule über dem Standort. Signifikante Druckänderungen dienen als Indikator für herannahende Frontensysteme, während die Sichtweite Aufschluss über die aktuelle Schichtung und Stabilität der unteren Luftmassen gibt.
          </p>
        </div>
        <ChartAtmosphere data={weatherDataHourly} dailyData={weatherDataDaily} />
        <div>
          <h3 className="text-lg font-bold my-3 text-center">Tabellen Wetterprognose </h3>
        </div>



        { /* Daily Weather Date Table */}
        <MoveableScrollAreaHorizontal className="bg-gray-400 rounded-xl flex flex-row gap-1 p-2 w-full overflow-x-auto no-scrollbar">
          {dailyArray.length > 0 && dailyArray.map((item, idx) => {
            const isSelected = selectedDate === new Date(item.date).toISOString().slice(0, 10);
            return (
              <div
                key={idx}
                className={`flex flex-col rounded-xl border-r border-slate-400 cursor-pointer 
                    ${isSelected ?
                    "bg-blue-100 ring-1 ring-blue-400 shadow-[1px_1px_0_0_rgba(156,163,175,1)]"
                    :
                    "bg-white shadow-[4px_4px_0_0_rgba(156,163,175,1)]"}

                    hover:shadow-md hover:ring-1 hover:ring-gray-400`}

                onClick={() =>
                  setSelectedDate(
                    isSelected
                      ? selectedDate
                      : new Date(item.date).toISOString().slice(0, 10)
                  )
                }
              >
                <div className="h-11 p-2 bg-gray-300 rounded-tl-xl rounded-tr-xl flex flex-col items-center justify-center border-b border-slate-400">
                  {new Date(item.date)
                    .toLocaleDateString("de-DE", { day: "2-digit", month: "short" })
                    .replace(/\.$/, "")}
                </div>
                {/* Weather Icon */}
                <div className="h-20 text-orange-400 p-2 flex items-center justify-center">
                  <WeatherIcon code={Number(item.weather_code)} size={40} showName={true} />
                </div>
                {/* Temperature */}
                <div className="p-2 flex flex-col items-center justify-center">
                  <span className="text-xs text-gray-500">min / max</span>
                  <span className="text-xs text-gray-500">Temperatur °C</span>
                  <span className="text-sm font-bold font-sans">{(item.temperature_2m_min ?? 0).toFixed(1)} / {(item.temperature_2m_max ?? 0).toFixed(1)}</span>
                </div>
                {/* gef. Temperature */}
                <div className="p-2 flex flex-col items-center justify-center">
                  <span className="text-xs text-gray-500">gef. Temp. °C</span>
                  <span className="text-sm font-bold font-sans">{(item.apparent_temperature_min ?? 0).toFixed(1)} / {(item.apparent_temperature_max ?? 0).toFixed(1)}</span>
                </div>
                {/* Wind km/h Direction */}
                <div className="p-2 flex flex-col items-center justify-center">
                  <span className="text-xs text-gray-500">Wind km/h</span>
                  <span className="text-xs text-gray-500">Richtung °</span>
                  <span className="text-sm font-bold font-sans">{Math.round(item.wind_speed_10m_max ?? 0)} / {Math.round(item.wind_gusts_10m_max ?? 0)}</span>
                  <span className="text-sm font-bold font-sans">{Math.round(item.wind_direction_10m_dominant ?? 0)} </span>
                </div>
                {/* Rain */}
                <div className="p-2 flex flex-col items-center justify-center">
                  <span className="text-xs text-gray-500">Regen mm / h</span>
                  <span className="text-sm font-bold font-sans">{(item.precipitation_sum ?? 0).toFixed(1)} / {item.precipitation_hours ?? 0}</span>
                </div>
                {/*Strahling*/}
                <div className="p-2 flex flex-col items-center justify-center">
                  <span className="text-xs text-gray-500">Strahlung (MJ/m²) / ET₀ (mm)</span>
                  <span className="text-sm font-bold font-sans">{(item.shortwave_radiation_sum ?? 0).toFixed(1)} / {(item.et0_fao_evapotranspiration ?? 0).toFixed(1)}</span>
                </div>
                {/* Sonnenaufgang */}
                <div className="p-2 flex flex-col items-center justify-center">
                  <span className="text-xs text-gray-500">Sonnenaufgang</span>
                  <span className="text-sm font-bold font-sans">{item.sunrise ? new Date(item.sunrise).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}</span>
                </div>
                {/* Sonnenuntergang */}
                <div className="p-2 flex flex-col items-center justify-center">
                  <span className="text-xs text-gray-500">Sonnenuntergang</span>
                  <span className="text-sm font-bold font-sans">{item.sunset ? new Date(item.sunset).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}</span>
                </div>
              </div>
            );
          })}
        </MoveableScrollAreaHorizontal>

        {/* Hourly Weather Date Table, zweigeteilt */}
        <div className="flex flex-col gap-2 items-center justify-center">
          <h3 className="text-lg font-bold mt-3 text-center">
            Stündliche Wetterprognose
            {selectedDate && (
              <span className="ml-2 text-base font-normal text-gray-600">
                (
                {new Date(selectedDate).toLocaleDateString("de-DE", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                  year: "numeric"
                }).replace(/^([a-zäöüß]+),\s?/, (match) => match.charAt(0).toUpperCase() + match.slice(1))}
                )
              </span>
            )}
          </h3>

          {/* Erste Zeile: 00:00 - 11:00 */}
          <MoveableScrollAreaHorizontal className="p-2 w-full rounded-xl bg-gray-400 flex flex-row gap-1">
            {Array.isArray(weatherDataHourly) &&
              weatherDataHourly
                .filter((item) => {
                  const itemDate = new Date(item.time);
                  const itemUTCDate = itemDate.toISOString().slice(0, 10);
                  return selectedDate ? itemUTCDate === selectedDate : true;
                })
                .filter((item) => {
                  const hour = new Date(item.time).getUTCHours();
                  return hour >= 0 && hour <= 11;
                })
                .map((item, idx) => {
                  const hourDate = new Date(item.time);
                  const daily = dailyArray.find(d =>
                    new Date(d.date).toDateString() === hourDate.toDateString()
                  );
                  let isDay: 0 | 1 = 1;
                  if (daily && daily.sunrise && daily.sunset) {
                    const sunrise = new Date(daily.sunrise);
                    const sunset = new Date(daily.sunset);
                    isDay = hourDate >= sunrise && hourDate < sunset ? 1 : 0;
                  }
                  return (
                    <div key={idx}
                      className="pb-1 flex flex-col rounded-xl w-full bg-white  border-r border-slate-400">
                      <div className="h-11 p-2 rounded-tl-xl rounded-tr-xl w-full min-w-35 flex flex-col items-center justify-center border-b bg-gray-300 border-slate-400">
                        <span className="text-center">
                          {hourDate.toLocaleDateString("de-DE", { day: "2-digit", month: "short" }).replace(/\.$/, "")}
                          <br />
                          {hourDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </span>
                      </div>
                      <div className="h-17 text-orange-400 flex items-center justify-center">
                        <WeatherIcon code={Number(item.weather_code)} isDay={isDay} size={42} showName={true} />
                      </div>
                      {/* Temperature */}
                      <div className="h-12 p-2 flex flex-col items-center justify-center">
                        <span className="text-xs text-gray-500">Temp. °C / Gefühlte °C</span>
                        <span className="text-sm font-bold font-sans">{(item.temperature ?? 0).toFixed(1)} / {(item.apparent_temperature ?? 0).toFixed(1)}</span>
                      </div>
                      {/* Feuchte */}
                      <div className="h-12 p-2 flex flex-col items-center justify-center">
                        <span className="text-xs text-gray-500">Feuchte % / VPD kPa</span>
                        <span className="text-sm font-bold font-sans">{Math.round(item.relative_humidity ?? 0)} / {Math.round(item.vapour_pressure_deficit ?? 0)}</span>
                      </div>
                      {/* Niederschlag */}
                      <div className="h-12 p-2 flex flex-col items-center justify-center">
                        <span className="text-xs text-gray-500">Niederschlag</span>
                        <span className="text-sm font-bold font-sans">{(item.precipitation_probability ?? 0).toFixed(1)} % / {(item.precipitation ?? 0).toFixed(1)} mm</span>
                      </div>
                      {/* Wind Speed / Direction */}
                      <div className="h-12 p-2 flex flex-col items-center justify-center">
                        <span className="text-xs text-gray-500">Wind km/h Richtung</span>
                        <span className="text-sm font-bold font-sans">{Math.round(item.wind_speed ?? 0)} / {Math.round(item.wind_gusts ?? 0)} / {Math.round(item.wind_direction ?? 0)}°</span>
                      </div>
                      {/* Sichtweite */}
                      <div className="h-12 p-2 flex flex-col items-center justify-center">
                        <span className="text-xs text-gray-500">Sichtweite km</span>
                        <span className="text-sm font-bold font-sans">{((item.visibility ?? 0) / 1000).toFixed(1)}</span>
                      </div>
                      {/* Luftdruck */}
                      <div className="h-12 p-2 flex flex-col items-center justify-center">
                        <span className="text-xs text-gray-500">Luftdruck kPa</span>
                        <span className="text-sm font-bold font-sans">{Math.round(item.surface_pressure ?? 0)}</span>
                      </div>
                      {/* Evapotrans */}
                      <div className="h-12 p-2 flex flex-col items-center justify-center">
                        <span className="text-xs text-gray-500">Evapotrans. mm/h</span>
                        <span className="text-sm font-bold font-sans">{(item.evapotranspiration ?? 0).toFixed(1)} / {(item.et0_fao_evapotranspiration ?? 0).toFixed(1)}</span>
                      </div>
                    </div>
                  );
                })}
          </MoveableScrollAreaHorizontal>

          {/* Zweite Zeile: 12:00 - 23:00 */}
          <MoveableScrollAreaHorizontal className="w-full p-2 rounded-xl bg-gray-400 flex flex-row gap-1
          ">
            {Array.isArray(weatherDataHourly) &&
              weatherDataHourly
                .filter((item) => {
                  const itemDate = new Date(item.time);
                  const itemUTCDate = itemDate.toISOString().slice(0, 10);
                  return selectedDate
                    ? itemUTCDate === selectedDate
                    : true;
                })
                .filter((item) => {
                  const hour = new Date(item.time).getUTCHours();
                  return hour >= 12 && hour <= 23;
                })
                .map((item, idx) => {
                  const hourDate = new Date(item.time);
                  const daily = dailyArray.find(d =>
                    new Date(d.date).toDateString() === hourDate.toDateString()
                  );
                  let isDay: 0 | 1 = 1;
                  if (daily && daily.sunrise && daily.sunset) {
                    const sunrise = new Date(daily.sunrise);
                    const sunset = new Date(daily.sunset);
                    isDay = hourDate >= sunrise && hourDate < sunset ? 1 : 0;
                  }
                  return (
                    <div key={idx}
                      className="pb-1 flex flex-col rounded-xl w-full bg-white  border-r border-slate-400">
                      <div className="h-11 p-2 rounded-tl-xl rounded-tr-xl w-full min-w-35 flex flex-col items-center justify-center border-b bg-gray-300 border-slate-400">
                        <span className="text-center">
                          {hourDate.toLocaleDateString("de-DE", { day: "2-digit", month: "short" }).replace(/\.$/, "")}
                          <br />
                          {hourDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                        </span>
                      </div>
                      <div className="h-17 p-2 text-orange-400 flex items-center justify-center">
                        <WeatherIcon code={Number(item.weather_code)} isDay={isDay} size={42} showName={true} />
                      </div>
                      {/* Temperature */}
                      <div className="h-12 p-2 flex flex-col items-center justify-center">
                        <span className="text-xs text-gray-500">Temp. °C / Gefühlte °C</span>
                        <span className="text-sm font-bold font-sans">{(item.temperature ?? 0).toFixed(1)} / {(item.apparent_temperature ?? 0).toFixed(1)}</span>
                      </div>
                      {/* Feuchte */}
                      <div className="h-12 p-2 flex flex-col items-center justify-center">
                        <span className="text-xs text-gray-500">Feuchte % / VPD kPa</span>
                        <span className="text-sm font-bold font-sans">{Math.round(item.humidity ?? 0)} / {Math.round(item.vapour_pressure_deficit ?? 0)}</span>
                      </div>
                      {/* Niederschlag */}
                      <div className="h-12 p-2 flex flex-col items-center justify-center">
                        <span className="text-xs text-gray-500">Niederschlag</span>
                        <span className="text-sm font-bold font-sans">{(item.precipitation_probability ?? 0).toFixed(1)} % / {(item.precipitation ?? 0).toFixed(1)} mm</span>
                      </div>
                      {/* Wind Speed / Direction */}
                      <div className="h-12 p-2 flex flex-col items-center justify-center">
                        <span className="text-xs text-gray-500">Wind km/h Richtung</span>
                        <span className="text-sm font-bold font-sans">{Math.round(item.wind_speed ?? 0)} / {Math.round(item.wind_gusts ?? 0)} / {Math.round(item.wind_direction ?? 0)}°</span>
                      </div>
                      {/* Sichtweite */}
                      <div className="h-12 p-2 flex flex-col items-center justify-center">
                        <span className="text-xs text-gray-500">Sichtweite km</span>
                        <span className="text-sm font-bold font-sans">{((item.visibility ?? 0) / 1000).toFixed(1)}</span>
                      </div>
                      {/* Luftdruck */}
                      <div className="h-12 p-2 flex flex-col items-center justify-center">
                        <span className="text-xs text-gray-500">Luftdruck kPa</span>
                        <span className="text-sm font-bold font-sans">{Math.round(item.surface_pressure ?? 0)}</span>
                      </div>
                      {/* Evapotrans */}
                      <div className="h-12 p-2 flex flex-col items-center justify-center">
                        <span className="text-xs text-gray-500">Evapotrans. mm/h</span>
                        <span className="text-sm font-bold font-sans">{(item.evapotranspiration ?? 0).toFixed(1)} / {(item.et0_fao_evapotranspiration ?? 0).toFixed(1)}</span>
                      </div>
                    </div>
                  );
                })}
          </MoveableScrollAreaHorizontal>
        </div>
      </MoveableScrollAreaVertical>
    </div>
  );
}