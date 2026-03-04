export type WeatherCurrent = {
    time: Date | null;
    temperature_2m?: number;
    is_day?: number;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
    wind_gusts_10m?: number;
    relative_humidity_2m?: number;
    weather_code?: number;
    apparent_temperature?: number;
    precipitation?: number;
    cloud_cover?: number;
    surface_pressure?: number;
} | null;

export interface HourlyDataItem {
    time: Date;
    temperature?: number;
    relative_humidity?: number;
    apparent_temperature?: number;
    humidity?: number;
    precipitation_probability?: number;
    precipitation?: number;
    weather_code?: number;
    surface_pressure?: number;
    visibility?: number;
    evapotranspiration?: number;
    et0_fao_evapotranspiration?: number;
    vapour_pressure_deficit?: number;
    wind_speed?: number;
    wind_direction?: number;
    wind_gusts?: number;
}

export type WeatherHourly = {
    time: Date[];
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
} | null;

export type WeatherDaily = {
    time: Date[];
    weather_code?: number[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
    apparent_temperature_max?: number[];
    apparent_temperature_min?: number[];
    wind_speed_10m_max?: number[];
    wind_gusts_10m_max?: number[];
    wind_direction_10m_dominant?: number[];
    shortwave_radiation_sum?: number[];
    et0_fao_evapotranspiration?: number[];
    sunrise?: Date[];
    sunset?: Date[];
    precipitation_sum?: number[];
    precipitation_hours?: number[];
} | null;

export type WeatherClientProps = {
    weatherDataCurrent: WeatherCurrent | null;
    weatherDataHourly: HourlyDataItem[];
    weatherDataDaily: WeatherDaily;
    elevation?: number | null;
};

export interface weatherDataCurrent {
    time: Date | null;
    temperature_2m?: number;
    is_day?: number;
    wind_speed_10m?: number;
    wind_direction_10m?: number;
    wind_gusts_10m?: number;
    relative_humidity_2m?: number;
    weather_code?: number;
    apparent_temperature?: number;
    precipitation?: number;
    cloud_cover?: number;
    surface_pressure?: number;
}



