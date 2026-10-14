const formatter = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 });

export function formatNumber(value: unknown) {
  return typeof value === "number" ? formatter.format(value) : "–";
}

export const CHART_COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#dc2626", "#7c3aed", "#0891b2", "#db2777", "#65a30d"];
