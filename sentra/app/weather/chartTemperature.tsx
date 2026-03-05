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

type ChartTemperatureProps = {
  data: HourlyDataItem[];
};

type ChartPoint = {
  time: number;
  temperature: number | null;
  apparent_temperature: number | null;
  temperature_pos: number | null;
  temperature_neg: number | null;
  apparent_temperature_pos: number | null;
  apparent_temperature_neg: number | null;
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

function buildYAxisConfig(
  data: ChartPoint[],
  step = 5
): { yTicks: number[]; yDomain: [number, number] } {
  const values = data
    .flatMap((d) => [d.temperature, d.apparent_temperature])
    .filter((v): v is number => Number.isFinite(v));

  if (values.length === 0) return { yTicks: [0, 5, 10], yDomain: [0, 10] };

  let min = Math.floor(Math.min(...values) / step) * step;
  let max = Math.ceil(Math.max(...values) / step) * step;

  min = Math.min(min, 0);
  max = Math.max(max, 0);

  if (min === max) max = min + step;

  const yTicks = Array.from({ length: (max - min) / step + 1 }, (_, i) => min + i * step);
  return { yTicks, yDomain: [min, max] };
}

export default function ChartTemperature({ data }: ChartTemperatureProps) {
  const chartData = useMemo<ChartPoint[]>(
    () =>
      [...(data ?? [])]
        .map((item) => {
          const ts = new Date(item.time).getTime();
          const temp = typeof item.temperature === "number" ? item.temperature : null;
          const app =
            typeof item.apparent_temperature === "number" ? item.apparent_temperature : null;

          return {
            time: ts,
            temperature: temp,
            apparent_temperature: app,
            temperature_pos: temp !== null && temp > 0 ? temp : null,
            temperature_neg: temp !== null && temp <= 0 ? temp : null,
            apparent_temperature_pos: app !== null && app > 0 ? app : null,
            apparent_temperature_neg: app !== null && app <= 0 ? app : null,
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

  const { yTicks, yDomain } = buildYAxisConfig(chartData, 5);

  return (
    <div style={styles.grid}>
      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Temperatur °C</h2>
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
                <linearGradient id="tempPosFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60A5FA" stopOpacity={0.50} />
                  <stop offset="100%" stopColor="#1D4ED8" stopOpacity={0.08} />
                </linearGradient>

                <linearGradient id="tempNegFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FB7185" stopOpacity={0.38} />
                  <stop offset="100%" stopColor="#B91C1C" stopOpacity={0.12} />
                </linearGradient>

                <linearGradient id="appPosFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22D3EE" stopOpacity={0.42} />
                  <stop offset="100%" stopColor="#0E7490" stopOpacity={0.06} />
                </linearGradient>

                <linearGradient id="appNegFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FDA4AF" stopOpacity={0.34} />
                  <stop offset="100%" stopColor="#991B1B" stopOpacity={0.10} />
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
                width={54}
                ticks={yTicks}
                domain={yDomain}
                tickFormatter={(value) => (value === yTicks[0] ? "" : String(value))}
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
                  fontSize: 11,            // kleiner
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
                formatter={(value) => {
                  const num = typeof value === "number" ? value : Number(value);
                  return Number.isFinite(num) ? `${num.toFixed(1)} °C` : "-";
                }}
              />
              <Area
                type="monotone"
                dataKey="temperature_neg"
                stroke="none"
                fill="url(#tempNegFill)"
                fillOpacity={1}
                baseValue={0}
                isAnimationActive={false}
                legendType="none"
                dot={false}
                activeDot={false}
              />

              <Area
                type="monotone"
                dataKey="apparent_temperature_neg"
                stroke="none"
                fill="url(#appNegFill)"
                fillOpacity={1}
                baseValue={0}
                isAnimationActive={false}
                legendType="none"
                dot={false}
                activeDot={false}
              />

              <Area
                type="monotone"
                dataKey="temperature_pos"
                stroke="none"
                fill="url(#tempPosFill)"
                fillOpacity={1}
                baseValue={0}
                isAnimationActive={false}
                legendType="none"
                dot={false}
                activeDot={false}
              />

              <Area
                type="monotone"
                dataKey="apparent_temperature_pos"
                stroke="none"
                fill="url(#appPosFill)"
                fillOpacity={1}
                baseValue={0}
                isAnimationActive={false}
                legendType="none"
                dot={false}
                activeDot={false}
              />

              <Line
                type="monotone"
                dataKey="temperature"
                name="Temp."
                stroke="#3B82F6"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 2, strokeWidth: 3, stroke: "#0b1220", fill: "#3B82F6" }}
              />

              <Line
                type="monotone"
                dataKey="apparent_temperature"
                name="Temp. apparent"
                stroke="#67E8F9"
                strokeDasharray="5 3"
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 2, strokeWidth: 3, stroke: "#0b1220", fill: "#67E8F9" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}