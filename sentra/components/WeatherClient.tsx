"use client";
import { Thermometer, Hygrometer, Compass, Barometer } from "@/app/weather/Instruments";
import { useState, useEffect, useMemo } from "react";
import { WeatherClientProps, weatherDataCurrent } from "@/types/typesWeather";
import 'weather-icons/css/weather-icons.min.css';
import WeatherIcon from "@/app/weather/WeatherIcons";
import { MoveableScrollAreaVertical } from "@/components/CompMovableScrollAreaVertical"
import MoveableScrollAreaHorizontal from "@/components/CompMovableScrollAreaHorizontal"

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

export default function WeatherClient({
  weatherDataCurrent,
  weatherDataHourly,
  weatherDataDaily,
  elevation,
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
    async function fetchSensorData() {
      try {
        const response = await fetch('/api/sensor');
        const result = await response.json();

        if (result.wert) {
          // Wir initialisieren das Objekt inklusive der neuen Status-Felder
          const newSensorData: DualSensorState = {
            indoor: null,
            outdoor: null,
            indoorStatus: result.wert.indoorStatus || "offline",
            outdoorStatus: result.wert.outdoorStatus || "offline"
          };

          // Parsen der Klima-Daten (JSON-Strings vom ESP)
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
    const intervalId = window.setInterval(fetchSensorData, 60 * 1000); // 1 Minute Intervall

    return () => window.clearInterval(intervalId);
  }, []);


  useEffect(() => { }, [dailyArray]);

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
    const t = Math.min(diff / 8, 1);

    const from = { r: 229, g: 231, b: 235 }; // grau
    const to = isIndoorWarning
      ? { r: 220, g: 38, b: 38 }   // rot
      : { r: 22, g: 163, b: 74 };  // grün

    const lerp = (a: number, b: number, x: number) =>
      Math.round(a + (b - a) * x);

    return `rgb(${lerp(from.r, to.r, t)}, ${lerp(from.g, to.g, t)}, ${lerp(from.b, to.b, t)})`;
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
  const c_isDay = getNumber(weatherDataCurrent, "is_day");
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
    <div className="flex flex-col lg:flex-row gap-1 w-full h-full mx-auto overflow-hidden">
      <MoveableScrollAreaVertical className="flex-1 bg-gray-200 rounded-xl text-gray-800 px-13 w-screen hide-scrollbar overflow-y-auto shadow-md cursor-grab select-none">

        { /* Weather Instruments */}
        <div className="relative w-full h-full py-10 bg-blue-300 rounded-xl overflow-hidden shadow-xl flex flex-col items-center justify-center">
          <div>
            <h1 className="bg-gray-300/40 py-4 my-6 rounded-xl text-xl font-bold text-center">Aktuelle Wetterdaten</h1>
            <div className="p-10 bg-gray-300/40 rounded-xl flex flex-row gap-10 justify-center">

              <div className="flex justify-center items-center">
                <Thermometer temperature_2m={c_temperature_2m} apparentTemperature={c_apparentTemperature} />
              </div>
              <div className="flex flex-col gap-10">
                <div className="flex flex-row gap-10">
                  <Compass
                    c_wind_direction_10m={c_windDirection_10m}
                    c_wind_speed_10m={c_windSpeed_10m}
                    c_wind_gusts_10m={c_windGusts_10m}
                  />
                  <Hygrometer humidity={c_relativeHumidity_2m} />
                  <Barometer pressure={c_surfacePressure} />
                </div>
                <div className="bg-gray-300/50 p-6 rounded-xl flex flex-col md:flex-row gap-10 justify-center">
                  <div className="bg-white/30 flex flex-col p-4 rounded-xl shadow-sm min-w-50">
                    <WeatherIcon code={c_weatherCode} isDay={c_isDay} size={96} />
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
                        <span className="text-red-600 font-black animate-pulse text-xs">OFFLINE</span>
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
                        <span className="text-red-600 font-black animate-pulse text-xs">OFFLINE</span>
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
        <div>
          <h3 className="bg-gray-300 my-6 text-lg font-bold text-center">Tägliche Wetterprognose</h3>
        </div>

        { /* Daily Weather Date Table */}
        <MoveableScrollAreaHorizontal className="bg-gray-400 flex flex-row gap-1 p-2 w-full overflow-x-auto no-scrollbar">
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
          <MoveableScrollAreaHorizontal className="p-2 w-full bg-gray-400 flex flex-row gap-1">
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
                  let isDay = 1;
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
                        <span className="text-sm font-bold font-sans">{item.evapotranspiration ?? 0} / {(item.et0_fao_evapotranspiration ?? 0).toFixed(1)}</span>
                      </div>
                    </div>
                  );
                })}
          </MoveableScrollAreaHorizontal>

          {/* Zweite Zeile: 12:00 - 23:00 */}
          <MoveableScrollAreaHorizontal className="w-full p-2  bg-gray-400 flex flex-row gap-1
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
                  let isDay = 1;
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
                        <span className="text-sm font-bold font-sans">{(item.precipitation_probability ?? 0).toFixed(1)} % / {item.precipitation ?? 0} mm</span>
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
                        <span className="text-sm font-bold font-sans">{item.evapotranspiration} / {(item.et0_fao_evapotranspiration ?? 0).toFixed(1)}</span>
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