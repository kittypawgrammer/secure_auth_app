"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Download, LogOut, Plus, Upload, X } from "lucide-react";
import { useWorkbook } from "@/lib/excel/useWorkbook";
import { useCharts } from "@/lib/charts/useCharts";
import type { ChartType } from "@/lib/charts/types";
import { SheetTable } from "./SheetTable";
import { ChartCard } from "./ChartCard";
import { CHART_TYPES } from "./chartTypes";

type Props = { user: { name: string | null; email: string; is_admin: boolean } };

export function MisWorkspace({ user }: Props) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const { sheets, upload, addSheet, addColumn, addRow, updateCell, download } = useWorkbook();
  const { charts, addChart, updateChart, setType, flip, removeChart, moveChart } = useCharts();

  const [activeName, setActiveName] = useState<string | null>(null);
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Everything below is derived from `sheets`: no tab, column or row name is written in code
  const active = sheets.find((s) => s.name === activeName) ?? sheets[0];
  const sheetCharts = charts.filter((c) => c.sheet === active?.name);

  function clearSelection() {
    setSelectedRows([]);
    setSelectedColumns([]);
  }

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  async function handleUpload(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      await upload(file);
      setActiveName(null);
      clearSelection();
    } catch {
      setError("Could not read this file. Please upload an .xlsx, .xls or .csv file that is not password protected.");
    } finally {
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  // Run an add-tab/column/row action and show its error (e.g. "already exists") instead of crashing
  function tryAction(action: () => void) {
    setError(null);
    try {
      action();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    }
  }

  function handleAddSheet() {
    const name = prompt("New tab name")?.trim();
    if (name) tryAction(() => { addSheet(name); setActiveName(name); clearSelection(); });
  }

  function handleAddColumn() {
    const name = prompt("New column name")?.trim();
    if (name && active) tryAction(() => addColumn(active.name, name));
  }

  function handleAddRow() {
    const name = prompt("New row name")?.trim();
    if (name && active) tryAction(() => addRow(active.name, name));
  }

  function handleCreateChart(type: ChartType) {
    if (!active) return;
    // Keep the table's order, not the click order
    const rows = active.rows.filter((r) => selectedRows.includes(r.label)).map((r) => r.label);
    const columns = active.columns.filter((c) => selectedColumns.includes(c.key)).map((c) => c.key);
    addChart({
      type,
      sheet: active.name,
      rows,
      columns,
      xAxis: "columns",
      title: rows.join(", ").slice(0, 60) || "New chart",
    });
    clearSelection();
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const toolButton =
    "inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50";
  const canChart = selectedRows.length > 0 && selectedColumns.length > 0;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <header className="flex flex-wrap items-center gap-2 border-b bg-white px-6 py-3">
        <h1 className="mr-auto text-lg font-semibold">MIS Dashboard</h1>
        <input
          ref={fileInput}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => handleUpload(e.target.files?.[0])}
        />
        <button className={toolButton} onClick={() => fileInput.current?.click()}>
          <Upload size={16} /> Upload Excel
        </button>
        <button className={toolButton} onClick={() => download()} disabled={!sheets.length}>
          <Download size={16} /> Download
        </button>
        <span className="hidden text-sm text-gray-500 sm:inline">{user.name || user.email}</span>
        <button className={toolButton} onClick={handleLogout}>
          <LogOut size={16} /> Logout
        </button>
      </header>

      <main className="space-y-4 p-6">
        {error && (
          <div className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">
            {error}
            <button onClick={() => setError(null)}><X size={16} /></button>
          </div>
        )}

        {!active ? (
          <div className="rounded-xl border border-dashed bg-white p-12 text-center">
            <p className="mb-4 text-gray-600">Upload an Excel file to start, or create an empty tab.</p>
            <div className="flex justify-center gap-2">
              <button className={toolButton} onClick={() => fileInput.current?.click()}>
                <Upload size={16} /> Upload Excel
              </button>
              <button className={toolButton} onClick={handleAddSheet}>
                <Plus size={16} /> New tab
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Tabs come from the file (and from "+ Tab") */}
            <nav className="flex flex-wrap items-center gap-1 border-b">
              {sheets.map((s) => (
                <button
                  key={s.name}
                  onClick={() => { setActiveName(s.name); clearSelection(); }}
                  className={`rounded-t-lg px-4 py-2 text-sm ${
                    s.name === active.name ? "border border-b-white bg-white font-medium" : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {s.name}
                </button>
              ))}
              <button onClick={handleAddSheet} className="px-3 py-2 text-sm text-blue-600 hover:underline">
                + Tab
              </button>
            </nav>

            {active.title.length > 0 && <p className="text-sm text-gray-500">{active.title.join(" · ")}</p>}

            {sheetCharts.length > 0 && (
              <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                {sheetCharts.map((c) => (
                  <ChartCard
                    key={c.id}
                    config={c}
                    sheet={active}
                    onRename={(title) => updateChart(c.id, { title })}
                    onType={(type) => setType(c.id, type)}
                    onFlip={() => flip(c.id)}
                    onMove={(step) => moveChart(c.id, step)}
                    onRemove={() => removeChart(c.id)}
                  />
                ))}
              </section>
            )}

            {/* Chart builder: appears once rows/columns are clicked in the table */}
            <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm">
              {canChart ? (
                <>
                  <span className="mr-2 text-gray-600">
                    {selectedRows.length} row(s) × {selectedColumns.length} column(s) — add as:
                  </span>
                  {CHART_TYPES.map(({ type, label, Icon }) => (
                    <button key={type} className={toolButton} onClick={() => handleCreateChart(type)}>
                      <Icon size={16} /> {label}
                    </button>
                  ))}
                  <button className="ml-auto text-gray-500 hover:underline" onClick={clearSelection}>
                    Clear
                  </button>
                </>
              ) : (
                <span className="text-gray-500">
                  Click row names and column headers in the table to build a chart
                  {selectedRows.length + selectedColumns.length > 0 &&
                    ` (selected ${selectedRows.length} row(s), ${selectedColumns.length} column(s))`}
                  .
                </span>
              )}
              <div className="ml-auto flex gap-2">
                <button className={toolButton} onClick={handleAddColumn}><Plus size={16} /> Column</button>
                <button className={toolButton} onClick={handleAddRow}><Plus size={16} /> Row</button>
              </div>
            </div>

            <SheetTable
              sheet={active}
              selectedRows={selectedRows}
              selectedColumns={selectedColumns}
              onToggleRow={(label) => setSelectedRows((prev) => toggle(prev, label))}
              onToggleColumn={(key) => setSelectedColumns((prev) => toggle(prev, key))}
              onEditCell={(rowIndex, key, value) => updateCell(active.name, rowIndex, key, value)}
            />
          </>
        )}
      </main>
    </div>
  );
}
