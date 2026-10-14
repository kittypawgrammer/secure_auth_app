import { AreaChart, BarChart3, Gauge, LineChart, PieChart, type LucideIcon } from "lucide-react";
import type { ChartType } from "@/lib/charts/types";

// The icon buttons users click to pick a chart type (no dropdowns)
export const CHART_TYPES: { type: ChartType; label: string; Icon: LucideIcon }[] = [
  { type: "bar", label: "Bar", Icon: BarChart3 },
  { type: "line", label: "Line", Icon: LineChart },
  { type: "area", label: "Area", Icon: AreaChart },
  { type: "pie", label: "Pie", Icon: PieChart },
  { type: "kpi", label: "KPI", Icon: Gauge },
];
