import WeatherClient from "@/components/WeatherClient";
import { fetchWeatherApi } from "openmeteo";

interface HourlyDataInput {
    time?: Date[];
    temperature_2m?: number[];
    relative_humidity_2m?: number[];
    apparent_temperature?: number[];
    precipitation_probability?: number[];
    precipitation?: number[];
    weather_code?: number[];
    surface_pressure?: number[];
    visibility?: number[];
    evapotranspiration?: number[];
    et0_fao_evapotranspiration?: number[];
    vapour_pressure_deficit?: number[];
    wind_speed_10m?: number[];
    wind_direction_10m?: number[];
    wind_gusts_10m?: number[];
}

function processHourlyData(hourlyData: HourlyDataInput | null) {
    if (!hourlyData || !hourlyData.time || hourlyData.time.length === 0) {
        return [];
    }

    const {
        time,
        temperature_2m,
        relative_humidity_2m,
        apparent_temperature,
        precipitation_probability,
        precipitation,
        weather_code,
        surface_pressure,
        visibility,
        evapotranspiration,
        et0_fao_evapotranspiration,
        vapour_pressure_deficit,
        wind_speed_10m,
        wind_direction_10m,
        wind_gusts_10m,
    } = hourlyData;

    if (
        !time ||
        !temperature_2m ||
        !relative_humidity_2m ||
        !apparent_temperature ||
        !precipitation_probability ||
        !precipitation ||
        !weather_code ||
        !surface_pressure ||
        !visibility ||
        !evapotranspiration ||
        !et0_fao_evapotranspiration ||
        !vapour_pressure_deficit ||
        !wind_speed_10m ||
        !wind_direction_10m ||
        !wind_gusts_10m
    ) {
        return [];
    }

    return time.map((_: Date, index: number) => ({
        time: time[index],
        temperature: temperature_2m[index],
        relative_humidity: relative_humidity_2m[index],
        apparent_temperature: apparent_temperature[index],
        precipitation_probability: precipitation_probability[index],
        precipitation: precipitation[index],
        weather_code: weather_code[index],
        surface_pressure: surface_pressure[index],
        visibility: visibility[index],
        evapotranspiration: evapotranspiration[index],
        et0_fao_evapotranspiration: et0_fao_evapotranspiration[index],
        vapour_pressure_deficit: vapour_pressure_deficit[index],
        wind_speed: wind_speed_10m[index],
        wind_direction: wind_direction_10m[index],
        wind_gusts: wind_gusts_10m[index],
    }));
}

async function getWeatherData() {
    const lat = 52.52;
    const lon = 13.405;
    const params = {
        latitude: lat,
        longitude: lon,
        current: [
            "temperature_2m",
            "is_day",
            "wind_speed_10m",
            "wind_direction_10m",
            "wind_gusts_10m",
            "relative_humidity_2m",
            "weather_code",
            "apparent_temperature",
            "precipitation",
            "cloud_cover",
            "surface_pressure"
        ],
        daily: [
            "weather_code",
            "temperature_2m_max",
            "temperature_2m_min",
            "apparent_temperature_max",
            "apparent_temperature_min",
            "wind_speed_10m_max",
            "wind_gusts_10m_max",
            "wind_direction_10m_dominant",
            "shortwave_radiation_sum",
            "et0_fao_evapotranspiration",
            "sunrise",
            "sunset",
            "precipitation_sum",
            "precipitation_hours"
        ],
        hourly: [
            "temperature_2m",
            "relative_humidity_2m",
            "apparent_temperature",
            "precipitation_probability",
            "precipitation",
            "weather_code",
            "surface_pressure",
            "visibility",
            "evapotranspiration",
            "et0_fao_evapotranspiration",
            "vapour_pressure_deficit",
            "wind_speed_10m",
            "wind_direction_10m",
            "wind_gusts_10m"
        ],
        forecast_days: 16,
    };
    const url = "https://api.open-meteo.com/v1/forecast";
    console.log(`WeatherClient: Lade Wetterdaten von ${url}...`);

    const responses = await fetchWeatherApi(url, params);

    const response = responses[0];
    if (!response) {
        throw new Error("WeatherClient: No weather API response received.");
    }
    console.log("WeatherClient: Wetterdaten erfolgreich von open-meteo geladen!");

    const elevation = response.elevation ? response.elevation() : null;
    const utcOffsetSeconds = response.utcOffsetSeconds();

    const current = response.current();
    const hourly = response.hourly();
    const daily = response.daily();

    const sunrise = daily ? daily.variables(10) : null;
    const sunset = daily ? daily.variables(11) : null;

    return {
        elevation,
    current: current
        ? {
              time: new Date((Number(current.time()) + utcOffsetSeconds) * 1000),
              temperature_2m: current.variables(0)?.value(),
              is_day: current.variables(1)?.value(),
              wind_speed_10m: current.variables(2)?.value(),
              wind_direction_10m: current.variables(3)?.value(),
              wind_gusts_10m: current.variables(4)?.value(),
              relative_humidity_2m: current.variables(5)?.value(),
              weather_code: current.variables(6)?.value(),
              apparent_temperature: current.variables(7)?.value(),
              precipitation: current.variables(8)?.value(),
              cloud_cover: current.variables(9)?.value(),
              surface_pressure: current.variables(10)?.value(),
          }
        : null,
    hourly: hourly
        ? {
              time: Array.from(
                  { length: (Number(hourly.timeEnd()) - Number(hourly.time())) / hourly.interval() },
                  (_, i) => new Date((Number(hourly.time()) + i * hourly.interval() + utcOffsetSeconds) * 1000)
              ),
              temperature_2m: Array.from(hourly.variables(0)?.valuesArray() ?? []),
              relative_humidity_2m: Array.from(hourly.variables(1)?.valuesArray() ?? []),
              apparent_temperature: Array.from(hourly.variables(2)?.valuesArray() ?? []),
              precipitation_probability: Array.from(hourly.variables(3)?.valuesArray() ?? []),
              precipitation: Array.from(hourly.variables(4)?.valuesArray() ?? []),
              weather_code: Array.from(hourly.variables(5)?.valuesArray() ?? []),
              surface_pressure: Array.from(hourly.variables(6)?.valuesArray() ?? []),
              visibility: Array.from(hourly.variables(7)?.valuesArray() ?? []),
              evapotranspiration: Array.from(hourly.variables(8)?.valuesArray() ?? []),
              et0_fao_evapotranspiration: Array.from(hourly.variables(9)?.valuesArray() ?? []),
              vapour_pressure_deficit: Array.from(hourly.variables(10)?.valuesArray() ?? []),
              wind_speed_10m: Array.from(hourly.variables(11)?.valuesArray() ?? []),
              wind_direction_10m: Array.from(hourly.variables(12)?.valuesArray() ?? []),
              wind_gusts_10m: Array.from(hourly.variables(13)?.valuesArray() ?? []),
          }
        : null,
    daily: daily
        ? {
              time: Array.from(
                  { length: (Number(daily.timeEnd()) - Number(daily.time())) / daily.interval() },
                  (_, i) => new Date((Number(daily.time()) + i * daily.interval() + utcOffsetSeconds) * 1000)
              ),
              weather_code: Array.from(daily.variables(0)?.valuesArray() ?? []),
              temperature_2m_max: Array.from(daily.variables(1)?.valuesArray() ?? []),
              temperature_2m_min: Array.from(daily.variables(2)?.valuesArray() ?? []),
              apparent_temperature_max: Array.from(daily.variables(3)?.valuesArray() ?? []),
              apparent_temperature_min: Array.from(daily.variables(4)?.valuesArray() ?? []),
              wind_speed_10m_max: Array.from(daily.variables(5)?.valuesArray() ?? []),
              wind_gusts_10m_max: Array.from(daily.variables(6)?.valuesArray() ?? []),
              wind_direction_10m_dominant: Array.from(daily.variables(7)?.valuesArray() ?? []),
              shortwave_radiation_sum: Array.from(daily.variables(8)?.valuesArray() ?? []),
              et0_fao_evapotranspiration: Array.from(daily.variables(9)?.valuesArray() ?? []),
              sunrise: sunrise
                  ? [...Array(sunrise.valuesInt64Length())].map((_, i) =>
                        new Date((Number(sunrise.valuesInt64(i)) + utcOffsetSeconds) * 1000)
                    )
                  : [],
              sunset: sunset
                  ? [...Array(sunset.valuesInt64Length())].map((_, i) =>
                        new Date((Number(sunset.valuesInt64(i)) + utcOffsetSeconds) * 1000)
                    )
                  : [],
              precipitation_sum: Array.from(daily.variables(12)?.valuesArray() ?? []),
              precipitation_hours: Array.from(daily.variables(13)?.valuesArray() ?? []),
          }
        : null
}};

export default async function WeatherPage() {
    let weatherData;
    try {
        weatherData = await getWeatherData();
    } catch (error) {
        return <div>Fehler beim Laden der Wetterdaten: {String(error)}</div>;
    }

    const processedHourlyData = processHourlyData(weatherData.hourly);

    return (
        <main>
            <WeatherClient
                weatherDataCurrent={weatherData.current}
                weatherDataHourly={processedHourlyData}
                weatherDataDaily={weatherData.daily}
                elevation={weatherData.elevation}
            />
        </main>
    );
}