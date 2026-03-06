"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  Tooltip,
  ReferenceLine,
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

type ChartTranspirationProps = {
  data: HourlyDataItem[];
};

type ChartPoint = {
  time: number;
  evapotranspiration: number | null;
  et0_fao_evapotranspiration: number | null;
  et_deficit: number | null;
  vapour_pressure_deficit: number | null;
  vpd_band: number;
  vpd_color: string;
  vpd_stress_label: string;
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

function getVpdStressMeta(vpd: number | null): { color: string; label: string } {
  if (vpd === null) return { color: "rgba(148,163,184,0)", label: "keine Daten" };
  if (vpd < 0.4) return { color: "#38BDF8", label: "sehr feucht" };
  if (vpd < 0.8) return { color: "#22C55E", label: "niedrig" };
  if (vpd < 1.2) return { color: "#EAB308", label: "optimal" };
  if (vpd < 1.6) return { color: "#F97316", label: "hoch" };
  return { color: "#EF4444", label: "sehr hoch (Stress)" };
}

function buildEtYAxisConfig(
  data: ChartPoint[]
): { yTicks: number[]; yDomain: [number, number] } {
  const values = data
    .flatMap((d) => [d.evapotranspiration, d.et0_fao_evapotranspiration, d.et_deficit])
    .filter((v): v is number => Number.isFinite(v));

  if (values.length === 0) {
    return { yTicks: [-0.4, -0.2, 0, 0.2, 0.4], yDomain: [-0.4, 0.4] };
  }

  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const span = maxValue - minValue;
  const step = span <= 1 ? 0.2 : span <= 3 ? 0.5 : span <= 10 ? 1 : 2;

  let min = Math.floor(minValue / step) * step;
  let max = Math.ceil(maxValue / step) * step;
  if (min === max) {
    min -= step;
    max += step;
  }

  const count = Math.round((max - min) / step) + 1;
  const yTicks = Array.from({ length: count }, (_, i) =>
    Number((min + i * step).toFixed(2))
  );

  return {
    yTicks,
    yDomain: [Number(min.toFixed(2)), Number(max.toFixed(2))],
  };
}

function buildVpdYAxisConfig(
  data: ChartPoint[]
): { yTicks: number[]; yDomain: [number, number] } {
  const values = data
    .map((d) => d.vapour_pressure_deficit)
    .filter((v): v is number => Number.isFinite(v));

  if (values.length === 0) {
    return { yTicks: [0, 0.5, 1.0, 1.5, 2.0], yDomain: [0, 2.0] };
  }

  const maxValue = Math.max(2.0, ...values);
  const step = maxValue <= 2 ? 0.2 : maxValue <= 4 ? 0.5 : 1;
  const max = Math.ceil(maxValue / step) * step;

  const yTicks = Array.from({ length: Math.round(max / step) + 1 }, (_, i) =>
    Number((i * step).toFixed(2))
  );

  return { yTicks, yDomain: [0, Number(max.toFixed(2))] };
}

function toFinite(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

export default function ChartTranspiration({ data }: ChartTranspirationProps) {
  const chartData = useMemo<ChartPoint[]>(
    () =>
      [...(data ?? [])]
        .map((item) => {
          const ts = new Date(item.time).getTime();
          const et = toFinite(item.evapotranspiration);
          const et0 = toFinite(item.et0_fao_evapotranspiration);
          const deficit = et !== null && et0 !== null ? et0 - et : null;
          const vpd = toFinite(item.vapour_pressure_deficit);
          const stress = getVpdStressMeta(vpd);

          return {
            time: ts,
            evapotranspiration: et,
            et0_fao_evapotranspiration: et0,
            et_deficit: deficit,
            vapour_pressure_deficit: vpd,
            vpd_band: 1,
            vpd_color: stress.color,
            vpd_stress_label: stress.label,
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

  const { yTicks: etTicks, yDomain: etDomain } = buildEtYAxisConfig(chartData);
  const { yTicks: vpdTicks, yDomain: vpdDomain } = buildVpdYAxisConfig(chartData);

  type VpdHeatShapeProps = {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
    payload?: ChartPoint;
  };

  function renderVpdHeatShape({
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    payload,
  }: VpdHeatShapeProps) {
    if (width <= 0 || height <= 0) return null;

    return (
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={payload?.vpd_color ?? "rgba(148,163,184,0)"}
        fillOpacity={0.45}
      />
    );
  }

  return (
    <div style={styles.grid}>
      <section style={styles.card}>
        <h2 style={styles.cardTitle}>Evapotranspiration, ET0 FAO und VPD</h2>
        <div style={styles.chartWrap}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <ComposedChart data={chartData} syncId="weather" margin={CHART_MARGIN}>
              <CartesianGrid
                stroke="#d4d5d6"
                strokeOpacity={0.65}
                strokeDasharray="4 4"
                vertical
                fill="#fbfcfd"
                fillOpacity={0.15}
              />

              <defs>
                <linearGradient id="etActualFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22C55E" stopOpacity={0.34} />
                  <stop offset="100%" stopColor="#15803D" stopOpacity={0.06} />
                </linearGradient>

                <linearGradient id="etDeficitFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.28} />
                  <stop offset="100%" stopColor="#B45309" stopOpacity={0.05} />
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
                ticks={etTicks}
                domain={etDomain}
                tick={{ fill: "#d8dfe9", fontSize: 14 }}
                tickFormatter={(value) => String(value)}
                axisLine={true}
                tickLine={true}
                label={{
                  value: "mm/h",
                  angle: -90,
                  position: "insideLeft",
                  fill: "#d8dfe9",
                  fontSize: 14,
                }}
              />

              <YAxis yAxisId="vpdHeat" hide domain={[0, 1]} />

              <YAxis
                yAxisId="vpd"
                orientation="right"
                width={58}
                ticks={vpdTicks}
                domain={vpdDomain}
                tick={{ fill: "#F97316", fontSize: 14 }}
                tickFormatter={(value) =>
                  value === vpdTicks[0] ? "" : Number(value).toFixed(1)
                }
                axisLine={true}
                tickLine={true}
                label={{
                  value: "kPa",
                  angle: 90,
                  position: "insideRight",
                  fill: "#F97316",
                  fontSize: 14,
                }}
              />

              <Legend
                verticalAlign="bottom"
                align="center"
                iconType="line"
                height={36}
                wrapperStyle={{ paddingTop: 8, color: "#d8dfe9", fontSize: 14 }}
                itemSorter={(item) => {
                  if (item.dataKey === "et0_fao_evapotranspiration") return 0;
                  if (item.dataKey === "evapotranspiration") return 1;
                  if (item.dataKey === "et_deficit") return 2;
                  if (item.dataKey === "vapour_pressure_deficit") return 3;
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

                  const point =
                    Array.isArray(payload) && payload.length > 0
                      ? (payload[0]?.payload as ChartPoint | undefined)
                      : undefined;

                  const stressText = point?.vpd_stress_label
                    ? ` | VPD: ${point.vpd_stress_label}`
                    : "";

                  return `Datum: ${datum} | Uhrzeit: ${uhrzeit}${stressText}`;
                }}
                formatter={(value, name) => {
                  const num = typeof value === "number" ? value : Number(value);
                  if (!Number.isFinite(num)) return ["-", String(name)];
                  if (name === "VPD") return [`${num.toFixed(2)} kPa`, String(name)];
                  return [`${num.toFixed(2)} mm/h`, String(name)];
                }}
              />

              <Bar
                yAxisId="vpdHeat"
                dataKey="vpd_band"
                barSize={14}
                legendType="none"
                tooltipType="none"
                isAnimationActive={false}
                shape={renderVpdHeatShape}
              />

              <Area
                type="monotone"
                dataKey="evapotranspiration"
                stackId="etStack" // Gleiche ID wie Defizit
                name="Aktuelle ET"
                stroke="#22C55E"
                fill="url(#etActualFill)"
                connectNulls
              />

              <Area
                type="monotone"
                dataKey="et_deficit"
                stackId="etStack" // Gleiche ID wie ET
                name="Defizit zu ET0"
                stroke="#4a31da"
                fill="url(#etDeficitFill)"
                fillOpacity={0.5}
                connectNulls
              />

              <Line
                type="monotone"
                dataKey="et0_fao_evapotranspiration"
                name="ET0 (Referenz)"
                stroke="#d8dfe9"
                strokeDasharray="5 5"
                dot={false}
                activeDot={{ r: 2, strokeWidth: 3, stroke: "#0b1220", fill: "#22C55E" }}
              />

              <Line
                type="monotone"
                dataKey="et0_fao_evapotranspiration"
                name="ET0 FAO"
                stroke="#F59E0B"
                strokeDasharray="5 3"
                strokeWidth={1.8}
                dot={false}
                activeDot={{ r: 2, strokeWidth: 3, stroke: "#0b1220", fill: "#F59E0B" }}
              />

              <ReferenceLine
                yAxisId="vpd"
                y={1.2}
                stroke="#F97316"
                strokeDasharray="4 4"
                ifOverflow="extendDomain"
              />
              <ReferenceLine
                yAxisId="vpd"
                y={1.6}
                stroke="#EF4444"
                strokeDasharray="4 4"
                ifOverflow="extendDomain"
              />

              <Line
                yAxisId="vpd"
                type="monotone"
                dataKey="vapour_pressure_deficit"
                name="VPD"
                stroke="#EF4444"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 2, strokeWidth: 3, stroke: "#0b1220", fill: "#EF4444" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}