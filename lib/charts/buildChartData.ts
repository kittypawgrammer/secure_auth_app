import type { ParsedSheet } from "@/lib/excel/parseWorkbook";
import type { ChartConfig } from "./types";

type Point = Record<string, string | number | null>;

export function buildChartData(sheet: ParsedSheet, cfg: ChartConfig) {
  const rows = sheet.rows.filter((r) => cfg.rows.includes(r.label));
  const cols = sheet.columns.filter((c) => cfg.columns.includes(c.key));

  if (cfg.xAxis === "columns") {
    // one X point per column, one line/bar per row
    const data: Point[] = cols.map((c) => {
      const p: Point = { name: c.key };
      rows.forEach((r) => (p[r.label] = r.values[c.key] ?? null));
      return p;
    });
    return { data, series: rows.map((r) => r.label) };
  }

  // one X point per row, one line/bar per column
  const data: Point[] = rows.map((r) => {
    const p: Point = { name: r.label };
    cols.forEach((c) => (p[c.key] = r.values[c.key] ?? null));
    return p;
  });
  return { data, series: cols.map((c) => c.key) };
}
