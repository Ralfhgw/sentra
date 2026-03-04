import { fetchWeatherApi } from "openmeteo";


const lat = 52.52;
const lon = 13.405;

async function fetchWeather() {
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
    const responses = await fetchWeatherApi(url, params);

    const response = responses[0];
    if (!response) {
        throw new Error("No weather API response received.");
    }

    const latitude = response.latitude();
    const longitude = response.longitude();
    const elevation = response.elevation();
    const utcOffsetSeconds = response.utcOffsetSeconds();

    console.log(
        `\nCoordinates: ${latitude}°N ${longitude}°E`,
        `\nElevation: ${elevation}m asl`,
        `\nTimezone difference to GMT+0: ${utcOffsetSeconds}s`,
    );

    const current = response.current();
    const hourly = response.hourly();
    const daily = response.daily();
    if (!hourly || !daily) {
        throw new Error("Weather API response does not contain hourly or daily data.");
    }

    const sunrise = daily.variables(10);
    const sunset = daily.variables(11);

    const weatherData = {
        current: {
            time: current ? new Date((Number(current.time()) + utcOffsetSeconds) * 1000) : null,
            temperature_2m: current?.variables(0)?.value(),
            is_day: current?.variables(1)?.value(),
            wind_speed_10m: current?.variables(2)?.value(),
            wind_direction_10m: current?.variables(3)?.value(),
            wind_gusts_10m: current?.variables(4)?.value(),
            relative_humidity_2m: current?.variables(5)?.value(),
            weather_code: current?.variables(6)?.value(),
            apparent_temperature: current?.variables(7)?.value(),
            precipitation: current?.variables(8)?.value(),
            cloud_cover: current?.variables(9)?.value(),
            surface_pressure: current?.variables(10)?.value(),
        },
        hourly: {
            time: Array.from(
                { length: (Number(hourly.timeEnd()) - Number(hourly.time())) / hourly.interval() },
                (_, i) => new Date((Number(hourly.time()) + i * hourly.interval() + utcOffsetSeconds) * 1000)
            ),
            temperature_2m: hourly.variables(0)?.valuesArray(),
            relative_humidity_2m: hourly.variables(1)?.valuesArray(),
            apparent_temperature: hourly.variables(2)?.valuesArray(),
            precipitation_probability: hourly.variables(3)?.valuesArray(),
            precipitation: hourly.variables(4)?.valuesArray(),
            weather_code: hourly.variables(5)?.valuesArray(),
            surface_pressure: hourly.variables(6)?.valuesArray(),
            visibility: hourly.variables(7)?.valuesArray(),
            evapotranspiration: hourly.variables(8)?.valuesArray(),
            et0_fao_evapotranspiration: hourly.variables(9)?.valuesArray(),
            vapour_pressure_deficit: hourly.variables(10)?.valuesArray(),
            wind_speed_10m: hourly.variables(11)?.valuesArray(),
            wind_direction_10m: hourly.variables(12)?.valuesArray(),
            wind_gusts_10m: hourly.variables(13)?.valuesArray(),
        },
        daily: {
            time: Array.from(
                { length: (Number(daily.timeEnd()) - Number(daily.time())) / daily.interval() },
                (_, i) => new Date((Number(daily.time()) + i * daily.interval() + utcOffsetSeconds) * 1000)
            ),
            weather_code: daily.variables(0)?.valuesArray(),
            temperature_2m_max: daily.variables(1)?.valuesArray(),
            temperature_2m_min: daily.variables(2)?.valuesArray(),
            apparent_temperature_max: daily.variables(3)?.valuesArray(),
            apparent_temperature_min: daily.variables(4)?.valuesArray(),
            wind_speed_10m_max: daily.variables(5)?.valuesArray(),
            wind_gusts_10m_max: daily.variables(6)?.valuesArray(),
            wind_direction_10m_dominant: daily.variables(7)?.valuesArray(),
            shortwave_radiation_sum: daily.variables(8)?.valuesArray(),
            et0_fao_evapotranspiration: daily.variables(9)?.valuesArray(),
            sunrise: sunrise ? [...Array(sunrise.valuesInt64Length())].map((_, i) => new Date((Number(sunrise.valuesInt64(i)) + utcOffsetSeconds) * 1000)) : [],
            sunset: sunset ? [...Array(sunset.valuesInt64Length())].map((_, i) => new Date((Number(sunset.valuesInt64(i)) + utcOffsetSeconds) * 1000)) : [],
            precipitation_sum: daily.variables(12)?.valuesArray(),
            precipitation_hours: daily.variables(13)?.valuesArray(),
        },
    };
    console.log("\nCurrent data:\n", weatherData.current)
    console.log("\nHourly data:\n", weatherData.hourly)
    console.log("\nDaily data:\n", weatherData.daily)
}

fetchWeather().catch(console.error);