const weatherCodeToIcon = {
  0: { day: "wi-day-sunny", night: "wi-night-clear" },
  1: { day: "wi-day-sunny-overcast", night: "wi-night-partly-cloudy" },
  2: { day: "wi-day-cloudy", night: "wi-night-alt-cloudy" },
  3: { day: "wi-cloudy", night: "wi-cloudy" },
  45: { day: "wi-fog", night: "wi-fog" },
  48: { day: "wi-fog", night: "wi-fog" },
  51: { day: "wi-day-sprinkle", night: "wi-night-alt-sprinkle" },
  53: { day: "wi-day-sprinkle", night: "wi-night-alt-sprinkle" },
  55: { day: "wi-day-sprinkle", night: "wi-night-alt-sprinkle" },
  56: { day: "wi-day-rain-mix", night: "wi-night-alt-rain-mix" },
  57: { day: "wi-day-rain-mix", night: "wi-night-alt-rain-mix" },
  61: { day: "wi-day-showers", night: "wi-night-alt-showers" },
  63: { day: "wi-day-rain", night: "wi-night-alt-rain" },
  65: { day: "wi-day-rain", night: "wi-night-alt-rain" },
  66: { day: "wi-day-rain-mix", night: "wi-night-alt-rain-mix" },
  67: { day: "wi-day-rain-mix", night: "wi-night-alt-rain-mix" },
  71: { day: "wi-day-snow", night: "wi-night-alt-snow" },
  73: { day: "wi-day-snow", night: "wi-night-alt-snow" },
  75: { day: "wi-day-snow", night: "wi-night-alt-snow" },
  77: { day: "wi-snowflake-cold", night: "wi-snowflake-cold" },
  80: { day: "wi-day-showers", night: "wi-night-alt-showers" },
  81: { day: "wi-day-showers", night: "wi-night-alt-showers" },
  82: { day: "wi-day-showers", night: "wi-night-alt-showers" },
  85: { day: "wi-day-snow", night: "wi-night-alt-snow" },
  86: { day: "wi-day-snow", night: "wi-night-alt-snow" },
  95: { day: "wi-day-thunderstorm", night: "wi-night-alt-thunderstorm" },
  96: { day: "wi-day-thunderstorm", night: "wi-night-alt-thunderstorm" },
  99: { day: "wi-day-thunderstorm", night: "wi-night-alt-thunderstorm" },
};

export default function WeatherIcon({ code, isDay = 1, size = 48, showName = false }) {
  const iconSet = weatherCodeToIcon[code] || { day: "wi-na", night: "wi-na" };
  const iconClass = isDay ? iconSet.day : iconSet.night;
  const iconName = iconClass.replace(/^wi-/, "");
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "center" }}>
      <i className={`wi ${iconClass}`} style={{ fontSize: size }} />
      {showName && (
        <span style={{ fontSize: 10, color: "#888" }}>{iconName}</span>
      )}
    </span>
  );
}
