"use client";

import { useMemo } from "react";
import {
    ResponsiveContainer,
    ComposedChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Legend,
    Tooltip,
} from "recharts";
import type { HourlyDataItem, WeatherDaily } from "@/types/typesWeather";
import WeatherIcon from "@/app/weather/WeatherIcons";

const CHART_MARGIN = { top: 8, right: 16, left: 0, bottom: 4 };

const styles = {
    grid: {
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: 16,
    },
    card: {
        border: "1px solid rgba(148, 163, 184, 0.22)",
        borderRadius: 18,
        padding: 14,
        minWidth: 0,
        background: "linear-gradient(180deg, #0b1220 0%, #090f1a 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03), 0 18px 40px rgba(2,6,23,0.45)",
    },
    cardTitle: {
        margin: "0 0 10px",
        fontSize: "1rem",
        color: "#cbd5e1",
    },
    chartWrap: {
        width: "100%",
        height: 300,
        minWidth: 0,
    },
};

type ChartAtmosphereProps = {
    data: HourlyDataItem[];
    dailyData: WeatherDaily;
};

type BasePoint = {
    time: number;
    visibility_km: number | null;
    surface_pressure: number | null;
    weather_code: number | null;
};

type ChartPoint = BasePoint & {
    icon_anchor: number;
    show_icon: boolean;
};

type IconDotProps = {
    cx?: number;
    cy?: number;
    payload?: ChartPoint;
};

function toDayKey(ts: number): string {
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

function formatDayAxis(ts: number): string {
    return new Date(ts).toLocaleDateString("de-DE", {
        day: "2-digit",
        month: "2-digit",
    });
}

function describeWmo(code: number): string {
    if (code === 0) return "Klar";
    if (code === 1) return "Ueberwiegend klar";
    if (code === 2) return "Teilweise bewoelkt";
    if (code === 3) return "Bedeckt";
    if (code === 45 || code === 48) return "Nebel";
    if (code === 51 || code === 53 || code === 55) return "Nieselregen";
    if (code === 61 || code === 63 || code === 65) return "Regen";
    if (code === 71 || code === 73 || code === 75) return "Schnee";
    if (code === 80 || code === 81 || code === 82) return "Regenschauer";
    if (code === 95 || code === 96 || code === 99) return "Gewitter";
    return "Wetterlage";
}

function buildVisibilityYAxisConfig(
    data: ChartPoint[]
): { yTicks: number[]; yDomain: [number, number] } {
    const values = data
        .map((d) => d.visibility_km)
        .filter((v): v is number => Number.isFinite(v));

    if (values.length === 0) return { yTicks: [0, 5, 10], yDomain: [0, 10] };

    const maxValue = Math.max(0, ...values);
    const step = maxValue <= 8 ? 1 : maxValue <= 20 ? 2 : 5;
    let max = Math.ceil(maxValue / step) * step;

    if (max <= 0) max = step;

    const yTicks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) => i * step);
    return { yTicks, yDomain: [0, max] };
}

function buildPressureYAxisConfig(
    data: ChartPoint[]
): { yTicks: number[]; yDomain: [number, number] } {
    const values = data
        .map((d) => d.surface_pressure)
        .filter((v): v is number => Number.isFinite(v));

    if (values.length === 0) return { yTicks: [990, 1000, 1010], yDomain: [988, 1012] };

    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const paddedMin = rawMin - 2;
    const paddedMax = rawMax + 2;
    const roughRange = paddedMax - paddedMin;
    const step = roughRange <= 12 ? 2 : roughRange <= 30 ? 5 : 10;

    const min = Math.floor(paddedMin / step) * step;
    let max = Math.ceil(paddedMax / step) * step;

    if (min === max) max = min + step;

    const count = Math.round((max - min) / step) + 1;
    const yTicks = Array.from({ length: count }, (_, i) => min + i * step);

    return { yTicks, yDomain: [min, max] };
}

function buildIconIndexSet(data: BasePoint[]): Set<number> {
    const perDay = new Map<string, { idx: number; distance: number }>();

    data.forEach((point, idx) => {
        const hour = new Date(point.time).getHours();
        const distance = Math.abs(hour - 12);
        const key = toDayKey(point.time);

        const current = perDay.get(key);
        if (!current || distance < current.distance) {
            perDay.set(key, { idx, distance });
        }
    });

    return new Set<number>(
        Array.from(perDay.values())
            .map((entry) => entry.idx)
            .filter((idx) => idx > 0 && idx < data.length - 1)
    );
}

function WeatherCodeDot({ cx, cy, payload }: IconDotProps) {
    if (!payload?.show_icon || !Number.isFinite(cx) || !Number.isFinite(cy)) return <g />;
    const code = typeof payload.weather_code === "number" ? payload.weather_code : -1;

    return (
        <g pointerEvents="none">
            <foreignObject x={(cx ?? 0) - 11} y={(cy ?? 0) - 26} width={22} height={22}>
                <div
                    style={{
                        width: "22px",
                        height: "22px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#f8fafc",
                    }}
                >
                    <div style={{ color: "#f3aa43" }}>
                        <WeatherIcon code={code} size={20} />
                    </div>
                </div>
            </foreignObject>
        </g>
    );
}

function buildDailyWeatherCodeMap(dailyData: WeatherDaily): Map<string, number | null> {
    const map = new Map<string, number | null>();
    if (!dailyData?.time?.length) return map;

    dailyData.time.forEach((d, idx) => {
        const key = toDayKey(new Date(d).getTime());
        const code = dailyData.weather_code?.[idx];
        map.set(key, typeof code === "number" && Number.isFinite(code) ? code : null);
    });

    return map;
}

export default function ChartAtmosphere({ data, dailyData }: ChartAtmosphereProps) {
    const dailyCodeByDay = useMemo(() => buildDailyWeatherCodeMap(dailyData), [dailyData]);

    const chartData = useMemo<ChartPoint[]>(() => {
        const baseData: BasePoint[] = [...(data ?? [])]
            .map((item) => {
                const ts = new Date(item.time).getTime();
                const dayKey = toDayKey(ts);

                const visibilityKm =
                    typeof item.visibility === "number" && Number.isFinite(item.visibility)
                        ? item.visibility / 1000
                        : null;

                const pressure =
                    typeof item.surface_pressure === "number" && Number.isFinite(item.surface_pressure)
                        ? item.surface_pressure
                        : null;

                const hourlyFallback =
                    typeof item.weather_code === "number" && Number.isFinite(item.weather_code)
                        ? item.weather_code
                        : null;

                return {
                    time: ts,
                    visibility_km: visibilityKm,
                    surface_pressure: pressure,
                    weather_code: dailyCodeByDay.get(dayKey) ?? hourlyFallback,
                };
            })
            .filter((p) => Number.isFinite(p.time))
            .sort((a, b) => a.time - b.time);

        const iconIndices = buildIconIndexSet(baseData);

        return baseData.map((point, idx) => ({
            ...point,
            icon_anchor: 0,
            show_icon: iconIndices.has(idx),
        }));
    }, [data, dailyCodeByDay]);

    const dayTicks = useMemo<number[]>(() => {
        const seen = new Set<string>();
        return chartData
            .filter((p) => {
                const key = toDayKey(p.time);
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .map((p) => p.time);
    }, [chartData]);

    const { yTicks: visibilityTicks, yDomain: visibilityDomain } = buildVisibilityYAxisConfig(chartData);
    const { yTicks: pressureTicks, yDomain: pressureDomain } = buildPressureYAxisConfig(chartData);

    return (
        <div style={styles.grid}>
            <section style={styles.card}>
                <h2 style={styles.cardTitle}>Sichtweite / Luftdruck</h2>
                <div style={styles.chartWrap}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                        <ComposedChart data={chartData} syncId="weather" margin={CHART_MARGIN}>
                            {/* Grid Box */}
                            <CartesianGrid
                                stroke="#e1e3e4"
                                strokeOpacity={0.25}
                                strokeDasharray="4 4"
                                vertical
                                fill="#4f5e77"
                                fillOpacity={0.35}
                            />
                            {/* x axis */}
                            <XAxis
                                dataKey="time"
                                type="number"
                                scale="time"
                                domain={["dataMin", "dataMax"]}
                                ticks={dayTicks}
                                tickFormatter={formatDayAxis}
                                tick={{ fill: "#d8dfe9", fontSize: 14 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            {/* y axis left */}
                            <YAxis
                                yAxisId="left"
                                width={54}
                                ticks={visibilityTicks}
                                domain={visibilityDomain}
                                tick={{ fill: "#60A5FA", fontSize: 14 }}
                                tickFormatter={(value) => (value === visibilityTicks[0] ? "" : String(value))}
                                axisLine={true}
                                tickLine={true}
                                label={{
                                    value: "km",
                                    angle: -90,
                                    position: "insideLeft",
                                    fill: "#60A5FA",
                                    fontSize: 14,
                                }}
                            />
                            {/* Y axis right */}
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                width={58}
                                ticks={pressureTicks}
                                domain={pressureDomain}
                                tickFormatter={(value) => (value === pressureTicks[0] ? "" : String(value))}
                                tick={{ fill: "#F59E0B", fontSize: 14 }}
                                axisLine={true}
                                tickLine={true}
                                label={{
                                    value: "hPa",
                                    angle: 90,
                                    position: "insideRight",
                                    fill: "#F59E0B",
                                    fontSize: 14,
                                }}
                            />
                            {/* Legend */}
                            <Legend
                                verticalAlign="bottom"
                                align="center"
                                iconType="line"
                                height={36}
                                wrapperStyle={{ paddingTop: 8, color: "#d8dfe9", fontSize: 14 }}
                                itemSorter={(item) => {
                                    if (item.dataKey === "visibility_km") return 0;
                                    if (item.dataKey === "surface_pressure") return 1;
                                    return 99;
                                }}
                            />
                            {/* Tooltip */}
                            <Tooltip
                                offset={{ x: 40, y: 6 }}
                                cursor={{ stroke: "#94a3b8", strokeDasharray: "3 3", strokeOpacity: 0.45 }}
                                contentStyle={{
                                    background: "rgba(11,18,32,0.92)",
                                    border: "1px solid rgba(148,163,184,0.35)",
                                    borderRadius: 10,
                                    color: "#e2e8f0",
                                    boxShadow: "0 8px 24px rgba(2,6,23,0.45)",
                                    fontSize: 11,
                                    padding: "8px 10px",
                                }}
                                labelStyle={{ color: "#cbd5e1", fontWeight: 600, fontSize: 13 }}
                                itemStyle={{ color: "#e2e8f0", padding: 0, fontSize: 12 }}
                                separator=": "
                                labelFormatter={(label, payload) => {
                                    const d = new Date(Number(label));
                                    const datum = d.toLocaleDateString("de-DE", {
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                    });
                                    const uhrzeit = d.toLocaleTimeString("de-DE", {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                        hour12: false,
                                    });

                                    const code = payload?.[0]?.payload?.weather_code;
                                    const wmoText =
                                        typeof code === "number" ? ` | WMO ${code} (${describeWmo(code)})` : "";

                                    return `Datum: ${datum} | Uhrzeit: ${uhrzeit}${wmoText}`;
                                }}
                                formatter={(value, _name, item) => {
                                    const num = typeof value === "number" ? value : Number(value);
                                    if (!Number.isFinite(num)) return ["-", String(_name)];

                                    if (item?.dataKey === "visibility_km") return [`${num.toFixed(1)} km`, "Sichtweite"];
                                    if (item?.dataKey === "surface_pressure") return [`${num.toFixed(1)} hPa`, "Luftdruck"];
                                    return [`${num.toFixed(1)}`, String(_name)];
                                }}
                            />
                            {/* Sichtweite */}
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="visibility_km"
                                name="Sichtweite"
                                stroke="#60A5FA"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 2, strokeWidth: 3, stroke: "#0b1220", fill: "#60A5FA" }}
                            />
                            {/* Luftdruck */}
                            <Line
                                yAxisId="right"
                                type="monotone"
                                dataKey="surface_pressure"
                                name="Luftdruck"
                                stroke="#F59E0B"
                                strokeDasharray="5 3"
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 2, strokeWidth: 3, stroke: "#0b1220", fill: "#F59E0B" }}
                            />
                            {/* Weather Icon */}
                            <Line
                                yAxisId="left"
                                type="monotone"
                                dataKey="icon_anchor"
                                stroke="none"
                                legendType="none"
                                tooltipType="none"
                                isAnimationActive={false}
                                activeDot={false}
                                dot={(props) => <WeatherCodeDot {...(props as IconDotProps)} />}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </section>
        </div>
    );
}