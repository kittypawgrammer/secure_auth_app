"use client";

import { useEffect, useState } from "react";
import type { ChartConfig, ChartType } from "./types";

const STORAGE_KEY = "mis-charts";

// Same idea as useWorkbook: one list of chart configs, saved in the browser
export function useCharts() {
  // Load saved charts on first render (this hook only runs in the browser)
  const [charts, setCharts] = useState<ChartConfig[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  // Save automatically whenever a chart is added, changed or removed
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(charts));
  }, [charts]);

  function addChart(input: Omit<ChartConfig, "id">) {
    setCharts((prev) => [...prev, { ...input, id: crypto.randomUUID() }]);
  }

  function updateChart(id: string, changes: Partial<Omit<ChartConfig, "id">>) {
    setCharts((prev) => prev.map((c) => (c.id === id ? { ...c, ...changes } : c)));
  }

  function setType(id: string, type: ChartType) {
    updateChart(id, { type });
  }

  function flip(id: string) {
    setCharts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, xAxis: c.xAxis === "columns" ? "rows" : "columns" } : c))
    );
  }

  function removeChart(id: string) {
    setCharts((prev) => prev.filter((c) => c.id !== id));
  }

  // Move a chart one place left (-1) or right (+1)
  function moveChart(id: string, step: -1 | 1) {
    setCharts((prev) => {
      const i = prev.findIndex((c) => c.id === id);
      const j = i + step;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  return { charts, addChart, updateChart, setType, flip, removeChart, moveChart };
}
