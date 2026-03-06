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
import type { HourlyDataItem } from "@/types/typesWeather";

const CHART_MARGIN = { top: 8, right: 16, left: 0, bottom: 4 };
const PROBABILITY_TICKS = [0, 20, 40, 60, 80, 100];

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

type ChartPrecipitationProps = {
  data: HourlyDataItem[];
};

type ChartPoint = {
  time: number;
  precipitation: number | null;
  precipitation_probability: number | null;
  humidity: number | null;
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

function buildPrecipYAxisConfig(
  data: ChartPoint[]
): { yTicks: number[]; yDomain: [number, number] } {
  const values = data
    .map((d) => d.precipitation)
    .filter((v): v is number => Number.isFinite(v));

  if (values.length === 0) return { yTicks: [0, 1, 2], yDomain: [0, 2] };

  const maxValue = Math.max(0, ...values);
  const step = maxValue <= 10 ? 1 : maxValue <= 40 ? 5 : 10;
  let max = Math.ceil(maxValue / step) * step;

  if (max <= 0) max = step;

  const yTicks = Array.from({ length: max / step + 1 }, (_, i) => i * step);
  return { yTicks, yDomain: [0, max] };
}

export default function ChartPrecipitation({ data }: ChartPrecipitationProps) {
  const chartData = useMemo<ChartPoint[]>(
    () =>
      [...(data ?? [])]
        .map((item) => {
          const ts = new Date(item.time).getTime();
          const precipitation = typeof item.precipitation === "number" ? item.precipitation : null;
          const probability = typeof item.precipitation_probability === "number" ? item.precipitation_probability : null;
          const humidity = typeof item.relative_humidity === "number" ? item.relative_humidity : null;
          return {
            time: ts,
            precipitation,
            precipitation_probability: probability,
            humidity,
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

  const { yTicks, yDomain } = buildPrecipYAxisConfig(chartData);

  return (
    <div style={styles.grid}>
      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Niederschlag mm und Wahrscheinlichkeit %</h2>
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

              <XAxis
                dataKey="time"
                type="number"
                scale="time"
                domain={["dataMin", "dataMax"]}
                ticks={dayTicks}
                tickFormatter={formatDayAxis}
                tick={{ fill: "#d8dfe9", fontSize: 14 }}
                axisLine={true}
                tickLine={true}
              />

              <YAxis
                yAxisId="left"
                width={54}
                ticks={yTicks}
                domain={yDomain}
                tick={{ fill: "#2d8d50", fontSize: 14 }}
                axisLine={true}
                tickLine={true}
                label={{
                  value: "mm",
                  angle: -90,
                  position: "insideLeft",
                  fill: "#2d8d50",
                  fontSize: 14,
                }}
              />

              <YAxis
                yAxisId="right"
                orientation="right"
                width={58}
                domain={[0, 100]}
                ticks={PROBABILITY_TICKS}
                tickFormatter={(value) => `${value}%`}
                tick={{ fill: "#d8dfe9", fontSize: 14 }}
                axisLine={true}
                tickLine={true}
              />

              <Legend
                verticalAlign="bottom"
                align="center"
                iconType="line"
                height={36}
                wrapperStyle={{ paddingTop: 8, color: "#d8dfe9", fontSize: 14 }}
                                itemSorter={(item) => {
                  if (item.dataKey === "precipitation") return 0;
                  if (item.dataKey === "precipitation_probability") return 1;
                  if (item.dataKey === "humidity") return 2;
                  return 99;
                }}
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
                  if (name === "Niederschlagswahrscheinlichkeit") {
                    return [`${num.toFixed(0)} %`, String(name)];
                  }
                  return [`${num.toFixed(1)} mm`, String(name)];
                }}
              />

              <Line
                yAxisId="left"
                type="monotone"
                dataKey="precipitation"
                name="Niederschlag"
                stroke="#2d8d50"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 2, strokeWidth: 3, stroke: "#0b1220", fill: "#22C55E" }}
              />

              <Line
                yAxisId="right"
                type="monotone"
                dataKey="precipitation_probability"
                name="Niederschlagswahrscheinlichkeit"
                stroke="#a5e6bd"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 2, strokeWidth: 3, stroke: "#0b1220", fill: "#86EFAC" }}
              />

               <Line
                yAxisId="right"
                type="monotone"
                dataKey="humidity"
                name="Luftfeuchtigkeit"
                stroke="#d1737b"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 2, strokeWidth: 3, stroke: "#0b1220", fill: "#86EFAC" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}