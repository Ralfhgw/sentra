import Image from "next/image";
import { temperatureToPercentage, percentageToRotationPressure, percentageToRotationHygro } from "./InstrumentsCalculation";
import { CompassProps } from "@/types/typesWeather"

// --- Thermometer
type ThermometerCurrentProps = {
    temperature_2m: number;
    apparentTemperature: number;
};

export function Thermometer({ temperature_2m, apparentTemperature }: ThermometerCurrentProps) {
    const useTestTemperature = false;
    temperature_2m = useTestTemperature ? 50 : temperature_2m;
    apparentTemperature = useTestTemperature ? -40 : apparentTemperature;

    const fillTemperature_2m = temperatureToPercentage(temperature_2m);
    const fillApparentTemperature = temperatureToPercentage(apparentTemperature);

    const isApparentSmaller = fillApparentTemperature < fillTemperature_2m;
    const zIndexRed = isApparentSmaller ? 3 : 2;
    const zIndexBlue = isApparentSmaller ? 2 : 3;
    return (
        <div className="relative">
            <div className="absolute"
                style={{
                    top: "4.2vw",
                    left: "2.9vw",
                    width: "0.25vw",
                    height: "15.8vw",
                }}
            >
                <div
                    style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        width: "100%",
                        height: `${fillApparentTemperature}%`,
                        backgroundColor: "red",
                        transition: "height 0.3s ease",
                        zIndex: zIndexRed,
                    }}
                />
                <div
                    style={{
                        position: "absolute",
                        bottom: 0,
                        left: 0,
                        width: "100%",
                        height: `${fillTemperature_2m}%`,
                        backgroundColor: "blue",
                        transition: "height 0.3s ease",
                        zIndex: zIndexBlue,
                    }}
                />
            </div>
            <Image
                src="/thermometer.png"
                alt="Thermometer"
                width={150}
                height={600}
                className="h-[25vw] w-[6vw]"
            />
        </div>
    );
}

// --- Hygrometer
export function Hygrometer({ humidity }: { humidity: number }) {
    const rotation = percentageToRotationHygro(humidity);
    const size = "16vw";
    return (
        <div className="relative" style={{ height: size }}>
            <div>
                <Image src="/hygrometer.png" alt="Hygrometer" width={150} height={150} style={{ height: size, width: size }} />
            </div>
            <div
                style={{
                    position: "absolute",
                    height: size,
                    width: size,
                    top: "0vw",
                    left: "0vw",
                    transform: `rotate(${rotation}deg)`,
                    transformOrigin: "center",
                    transition: "transform 0.3s ease",
                }}
            >
                <Image
                    src="/hygrometer_scale.png"
                    alt="Hydrometer Scale"
                    width={150}
                    height={150}
                    loading="eager"
                    className="image"
                    style={{
                        height: size,
                        width: size,
                    }}
                />
            </div>
        </div>
    );
}

// --- Barometer
export function Barometer({ pressure }: { pressure: number }) {
    const rotation = percentageToRotationPressure(pressure);

    const size = "16vw";
    return (
        <div className="relative">
            <div>
                <Image src="/barometer.png" alt="Barometer" width={150} height={150} style={{ height: size, width: size }} />
            </div>
            <div
                style={{
                    position: "absolute",
                    height: size,
                    width: size,
                    top: "0vw",
                    left: "0vw",
                    transform: `rotate(${rotation}deg)`,
                    transformOrigin: "center",
                    transition: "transform 0.3s ease",
                }}
            >
                <Image
                    src="/barometer_scale.png"
                    alt="Barometer Scale"
                    width={150}
                    height={150}
                    loading="eager"
                    className="image"
                    style={{
                        height: size,
                        width: size,
                    }}
                />
            </div>
        </div>
    );
}

// --- Compass
export function Compass({ c_wind_direction_10m, c_wind_speed_10m, c_wind_gusts_10m }: CompassProps) {

   /*  const useTestWind = true;
    c_wind_direction_10m = useTestWind ? 200 : c_wind_direction_10m;
    c_wind_speed_10m = useTestWind ? 1 : c_wind_speed_10m;
    c_wind_gusts_10m = useTestWind ? 90 : c_wind_gusts_10m; */

    // Definiere die minimale und maximale Umdrehungsdauer (in Sekunden)
    const minDuration = 2; // schnellste Drehung (bei windSpeed = 90)
    const maxDuration = 200;   // langsamste Drehung (bei windSpeed = 0)
    const size = "14.5vw";
    const sizeRad = "16vw";
    // Begrenze windSpeed auf den Bereich 0–90
    const clampedSpeed = Math.max(0, Math.min(c_wind_speed_10m, 90));
    const clampedSpeedGusts = Math.max(0, Math.min(c_wind_gusts_10m, 90));
    // Berechne die Dauer abhängig von windSpeed
    // windSpeed = 0   → Zahnrad steht (keine Animation)
    // windSpeed = 90  → minDuration (schnellste Animation)
    // Dazwischen linear interpoliert
    const rotationDuration =
        clampedSpeed > 0
            ? maxDuration - (clampedSpeed / 90) * (maxDuration - minDuration)
            : 0;
    const rotationDurationGusts =
        clampedSpeedGusts > 0
            ? maxDuration - (clampedSpeedGusts / 90) * (maxDuration - minDuration)
            : 0;
    return (
        <div className="relative flex items-center justify-center" style={{ width: sizeRad, height: sizeRad }}>
            <Image
                src="/gear-gusts.png"
                alt="Zahnrad"
                width={150}
                height={150}
                style={{
                    width: sizeRad,
                    height: sizeRad,
                    pointerEvents: "none",
                    position: "absolute",
                    top: 0,
                    left: 0,
                    animation: rotationDurationGusts > 0
                        ? `spin ${rotationDurationGusts}s linear infinite`
                        : "none",
                }}
            />
            <Image
                src="/gear.png"
                alt="Zahnrad"
                width={150}
                height={150}
                style={{
                    width: sizeRad,
                    height: sizeRad,
                    pointerEvents: "none",
                    position: "absolute",
                    top: 0,
                    left: 0,
                    animation: rotationDuration > 0
                        ? `spin ${rotationDuration}s linear infinite`
                        : "none",
                }}
            />
            <Image
                src="/compass.png"
                alt="Kompass"
                width={150}
                height={150}
                style={{
                    width: size,
                    height: size,
                    zIndex: 2,
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                }}
            />
            <Image
                src="/compass_scale.png"
                alt="Kompass-Nadel"
                width={150}
                height={150}
                style={{
                    width: size,
                    height: size,
                    pointerEvents: "none",
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: `translate(-50%, -50%) rotate(${c_wind_direction_10m}deg)`,
                    transition: "transform 0.3s ease",
                    zIndex: 10,
                }}
            />
        </div>
    );
}

// --- Timeline
export function Timeline({
    marker,
    sunrise,
    sunset,
}: {
    marker: number;       // Marker-Zeit in Stunden, 0–24
    sunrise: number;      // Sonnenaufgang in Stunden, z.B. 7.5 = 07:30
    sunset: number;       // Sonnenuntergang in Stunden, z.B. 17.75 = 17:45
}) {
    const barHeight = 20;
    const markerSize = 18;

    const hours = Math.floor(marker);
    const minutes = Math.floor((marker - hours) * 60);
    const timeLabel = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;

    // Dämmerungs-Übergang in Stunden
    const twilight = 1; // 1 Stunde Übergang
    const gradient = `linear-gradient(to right,
        gray 0%,
        gray ${(sunrise - twilight) / 24 * 100}%,
        red ${(sunrise) / 24 * 100}%,
        orange ${(sunrise + twilight) / 24 * 100}%,
        orange ${(sunset - twilight) / 24 * 100}%,
        red ${(sunset) / 24 * 100}%,
        gray ${(sunset + twilight) / 24 * 100}%,
        gray 100%
    )`;

    return (
        <div className="flex flex-col items-start w-full mb-3">
            {/* Leiste mit Marker */}
            <div
                className="relative w-full rounded-full mb-3 shadow-inner border border-white"
                style={{
                    height: `${barHeight}px`,
                    background: gradient,
                    boxShadow: "inset 0 0 10px rgba(0,0,0,0.4)",
                }}
            >
                {/* Sonnenaufgang-Strich */}
                <div
                    className="absolute"
                    style={{
                        top: 0,
                        left: `calc(${(sunrise / 24) * 100}% - 1px)`,
                        width: "2px",
                        height: `${barHeight}px`,
                        background: "black",
                        zIndex: 2,
                    }}
                    title="Sonnenaufgang"
                />
                {/* Sonnenuntergang-Strich */}
                <div
                    className="absolute"
                    style={{
                        top: 0,
                        left: `calc(${(sunset / 24) * 100}% - 1px)`,
                        width: "2px",
                        height: `${barHeight}px`,
                        background: "black",
                        zIndex: 2,
                    }}
                    title="Sonnenuntergang"
                />
                {/* Marker */}
                <div
                    className="absolute flex items-center justify-center font-semibold"
                    style={{
                        top: "50%",
                        left: `calc(${(marker / 24) * 100}% - ${markerSize / 2}px)`,
                        width: `${markerSize}px`,
                        height: `${markerSize}px`,
                        borderRadius: "50%",
                        background: "radial-gradient(circle, #fff, #ef4444)",
                        boxShadow: "0 0 10px rgba(239,68,68,0.9), 0 0 20px rgba(239,68,68,0.6)",
                        fontSize: 10,
                        color: "#fff",
                        transform: "translateY(-50%)",
                    }}
                    title={timeLabel}
                />
            </div>
            <div className="flex flex-row w-full justify-between">
                {Array.from({ length: 24 }).map((_, i) => (
                    <div
                        key={i}
                        className="flex-1 text-center text-xs text-white bg-gray-500 rounded-lg px-0.5 shadow-sm border border-white"
                        style={{
                            minWidth: 0,
                        }}
                    >
                        {`${i.toString().padStart(2, "0")}`}
                    </div>
                ))}
            </div>
        </div>
    );
}
