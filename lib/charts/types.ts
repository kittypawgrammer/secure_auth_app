export type ChartType = "bar" | "line" | "area" | "pie" | "kpi";

export interface ChartConfig {
  id: string;
  title: string;
  type: ChartType;
  sheet: string;      // sheet (tab) name
  rows: string[];     // row labels picked in the table
  columns: string[];  // column keys picked in the table
  xAxis: "columns" | "rows"; // which selection goes on the X axis
}
