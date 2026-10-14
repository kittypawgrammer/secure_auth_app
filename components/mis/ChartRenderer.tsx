"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ParsedSheet } from "@/lib/excel/parseWorkbook";
import type { ChartConfig } from "@/lib/charts/types";
import { buildChartData } from "@/lib/charts/buildChartData";
import { CHART_COLORS, formatNumber } from "@/lib/charts/format";

// One component draws every chart type from a config, so nothing is chart-specific
export function ChartRenderer({ sheet, config }: { sheet: ParsedSheet; config: ChartConfig }) {
  const { data, series } = buildChartData(sheet, config);

  if (data.length === 0 || series.length === 0) {
    return <p className="p-4 text-sm text-gray-500">The rows or columns of this chart are no longer in the sheet.</p>;
  }

  if (config.type === "kpi") return <Kpi data={data} series={series} />;

  if (config.type === "pie") {
    // Pie shows the first series only: one slice per X item
    const first = series[0];
    const slices = data
      .map((d) => ({ name: String(d.name), value: typeof d[first] === "number" ? Math.abs(d[first] as number) : 0 }))
      .filter((s) => s.value > 0);
    return (
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={slices} dataKey="value" nameKey="name" outerRadius={90} label>
            {slices.map((s, i) => (
              <Cell key={s.name} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => formatNumber(Number(v))} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  const Chart = config.type === "line" ? LineChart : config.type === "area" ? AreaChart : BarChart;

  return (
    <ResponsiveContainer width="100%" height={260}>
      <Chart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
        <YAxis tickFormatter={(v) => formatNumber(Number(v))} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v) => formatNumber(Number(v))} />
        <Legend />
        {series.map((s, i) => {
          const color = CHART_COLORS[i % CHART_COLORS.length];
          if (config.type === "line")
            return <Line key={s} dataKey={s} stroke={color} connectNulls />;
          if (config.type === "area")
            return <Area key={s} dataKey={s} stroke={color} fill={color} fillOpacity={0.2} connectNulls />;
          return <Bar key={s} dataKey={s} fill={color} />;
        })}
      </Chart>
    </ResponsiveContainer>
  );
}

// KPI: one card per series, showing the first value and the change vs the second one
function Kpi({ data, series }: ReturnType<typeof buildChartData>) {
  return (
    <div className="grid grid-cols-1 gap-3 p-2 sm:grid-cols-2">
      {series.map((s) => {
        const main = data[0]?.[s];
        const compare = data[1]?.[s];
        const change =
          typeof main === "number" && typeof compare === "number" && compare !== 0
            ? ((main - compare) / Math.abs(compare)) * 100
            : null;
        return (
          <div key={s} className="rounded-lg border p-3">
            <p className="truncate text-xs text-gray-500">{s}</p>
            <p className="text-2xl font-semibold">{formatNumber(main)}</p>
            <p className="truncate text-xs text-gray-500">{String(data[0]?.name ?? "")}</p>
            {change !== null && (
              <p className={`text-xs ${change >= 0 ? "text-green-600" : "text-red-600"}`}>
                {change >= 0 ? "▲" : "▼"} {change.toFixed(1)}% vs {String(data[1]?.name)}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
