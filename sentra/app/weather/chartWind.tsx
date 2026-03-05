"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Tooltip,
} from "recharts";
import type { HourlyDataItem } from "@/types/typesWeather";

const CHART_MARGIN = { top: 8, right: 16, left: 0, bottom: 4 };
const DIRECTION_TICKS = [0, 90, 180, 270, 360];

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

type ChartWindProps = {
  data: HourlyDataItem[];
};

type ChartPoint = {
  time: number;
  wind_speed_10m: number | null;
  wind_gusts_10m: number | null;
  wind_direction_10m: number | null;
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

function clampDirection(value: number | null): number | null {
  if (value === null || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(360, value));
}

function buildLeftYAxisConfig(
  data: ChartPoint[],
  step = 5
): { yTicks: number[]; yDomain: [number, number] } {
  const values = data
    .flatMap((d) => [d.wind_speed_10m, d.wind_gusts_10m])
    .filter((v): v is number => Number.isFinite(v));

  if (values.length === 0) return { yTicks: [0, 5, 10], yDomain: [0, 10] };

  const min = 0;
  let max = Math.ceil(Math.max(...values) / step) * step;

  if (max <= 0) max = step;
  if (max === min) max = min + step;

  const yTicks = Array.from({ length: (max - min) / step + 1 }, (_, i) => min + i * step);
  return { yTicks, yDomain: [min, max] };
}

export default function ChartWind({ data }: ChartWindProps) {
  const chartData = useMemo<ChartPoint[]>(
    () =>
      [...(data ?? [])]
        .map((item) => {
          const ts = new Date(item.time).getTime();
          const speed = typeof item.wind_speed === "number" ? item.wind_speed : null;
          const gusts = typeof item.wind_gusts === "number" ? item.wind_gusts : null;
          const direction = typeof item.wind_direction === "number" ? item.wind_direction : null;

          return {
            time: ts,
            wind_speed_10m: speed,
            wind_gusts_10m: gusts,
            wind_direction_10m: clampDirection(direction),
          };
        })
        .filter((p) => Number.isFinite(p.time))
        .sort((a, b) => a.time - b.time),
    [data]
  );

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

  const { yTicks, yDomain } = buildLeftYAxisConfig(chartData, 5);

  return (
    <div style={styles.grid}>
      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Wind km/h und Richtung</h2>
        <div style={styles.chartWrap}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <ComposedChart data={chartData} syncId="weather" margin={CHART_MARGIN}>
              <CartesianGrid
                stroke="#d4d5d6"
                strokeOpacity={0.25}
                strokeDasharray="4 4"
                vertical
                fill="#2f3949"
                fillOpacity={0.35}
              />

              <defs>
                <linearGradient id="windSpeedFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38BDF8" stopOpacity={0.36} />
                  <stop offset="100%" stopColor="#0369A1" stopOpacity={0.06} />
                </linearGradient>

                <linearGradient id="windGustFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.30} />
                  <stop offset="100%" stopColor="#B45309" stopOpacity={0.06} />
                </linearGradient>
              </defs>

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

              <YAxis
                yAxisId="left"
                width={54}
                ticks={yTicks}
                domain={yDomain}
                tick={{ fill: "#d8dfe9", fontSize: 14 }}
                axisLine={false}
                tickLine={false}
              />

              <YAxis
                yAxisId="right"
                orientation="right"
                width={58}
                domain={[0, 360]}
                ticks={DIRECTION_TICKS}
                tickFormatter={(value) => `${value}°`}
                tick={{ fill: "#d8dfe9", fontSize: 14 }}
                axisLine={false}
                tickLine={false}
              />

              <Legend
                verticalAlign="bottom"
                align="center"
                iconType="line"
                height={36}
                wrapperStyle={{ paddingTop: 8, color: "#d8dfe9", fontSize: 14 }}
              />

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
                labelFormatter={(label) => {
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
                  return `Datum: ${datum} | Uhrzeit: ${uhrzeit}`;
                }}
                formatter={(value, name) => {
                  const num = typeof value === "number" ? value : Number(value);
                  if (!Number.isFinite(num)) return ["-", String(name)];
                  if (name === "Windrichtung") return [`${num.toFixed(0)}°`, String(name)];
                  return [`${num.toFixed(1)} km/h`, String(name)];
                }}
              />

              <Area
                yAxisId="left"
                type="monotone"
                dataKey="wind_speed_10m"
                stroke="none"
                fill="url(#windSpeedFill)"
                fillOpacity={1}
                isAnimationActive={false}
                legendType="none"
                tooltipType="none"
                dot={false}
                activeDot={false}
              />

              <Area
                yAxisId="left"
                type="monotone"
                dataKey="wind_gusts_10m"
                stroke="none"
                fill="url(#windGustFill)"
                fillOpacity={1}
                isAnimationActive={false}
                legendType="none"
                tooltipType="none"
                dot={false}
                activeDot={false}
              />

              <Line
                yAxisId="left"
                type="monotone"
                dataKey="wind_speed_10m"
                name="Wind"
                stroke="#38BDF8"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 2, strokeWidth: 3, stroke: "#0b1220", fill: "#38BDF8" }}
              />

              <Line
                yAxisId="left"
                type="monotone"
                dataKey="wind_gusts_10m"
                name="Boeen"
                stroke="#F59E0B"
                strokeDasharray="5 3"
                strokeWidth={1.8}
                dot={false}
                activeDot={{ r: 2, strokeWidth: 3, stroke: "#0b1220", fill: "#F59E0B" }}
              />

              <Line
                yAxisId="right"
                type="monotone"
                dataKey="wind_direction_10m"
                name="Windrichtung"
                stroke="#A78BFA"
                strokeWidth={1.6}
                strokeDasharray="2 3"
                dot={false}
                activeDot={{ r: 2, strokeWidth: 3, stroke: "#0b1220", fill: "#A78BFA" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}