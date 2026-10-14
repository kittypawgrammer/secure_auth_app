"use client";

import { useState } from "react";
import type { ParsedSheet } from "@/lib/excel/parseWorkbook";
import { formatNumber } from "@/lib/charts/format";

type Props = {
  sheet: ParsedSheet;
  selectedRows: string[];
  selectedColumns: string[];
  onToggleRow: (label: string) => void;
  onToggleColumn: (key: string) => void;
  onEditCell: (rowIndex: number, columnKey: string, value: number | null) => void;
};

// Click a row label or column header to select it for a chart. Double-click a cell to edit it.
export function SheetTable({ sheet, selectedRows, selectedColumns, onToggleRow, onToggleColumn, onEditCell }: Props) {
  const [editing, setEditing] = useState<{ row: number; col: string } | null>(null);

  function saveEdit(rowIndex: number, columnKey: string, text: string) {
    const trimmed = text.replace(/,/g, "").trim();
    const value = trimmed === "" ? null : Number(trimmed);
    if (value === null || !Number.isNaN(value)) onEditCell(rowIndex, columnKey, value);
    setEditing(null);
  }

  if (sheet.columns.length === 0 && sheet.rows.length === 0) {
    return <p className="p-6 text-sm text-gray-500">This tab is empty. Add a column and a row to start.</p>;
  }

  return (
    <div className="overflow-auto rounded-xl border bg-white">
      <table className="min-w-full border-collapse text-sm">
        <thead className="sticky top-0 bg-gray-50">
          <tr>
            <th className="sticky left-0 z-10 bg-gray-50 px-3 py-2 text-left font-medium text-gray-600">Particulars</th>
            {sheet.columns.map((c) => {
              const selected = selectedColumns.includes(c.key);
              return (
                <th
                  key={c.key}
                  onClick={() => onToggleColumn(c.key)}
                  title="Click to select for a chart"
                  className={`cursor-pointer whitespace-nowrap px-3 py-2 text-right font-medium ${
                    selected ? "bg-blue-100 text-blue-700" : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {c.path.length ? c.path.map((p) => <div key={p}>{p}</div>) : c.key}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sheet.rows.map((r, rowIndex) => {
            const rowSelected = selectedRows.includes(r.label);
            return (
              <tr key={`${r.label}-${rowIndex}`} className="border-t">
                <td
                  onClick={() => !r.isSection && onToggleRow(r.label)}
                  title={r.isSection ? undefined : "Click to select for a chart"}
                  className={`sticky left-0 whitespace-nowrap px-3 py-1.5 ${
                    r.isSection
                      ? "bg-gray-50 font-semibold text-gray-800"
                      : rowSelected
                        ? "cursor-pointer bg-blue-100 text-blue-700"
                        : "cursor-pointer bg-white hover:bg-gray-100"
                  }`}
                >
                  {r.label}
                </td>
                {sheet.columns.map((c) => {
                  const isEditing = editing?.row === rowIndex && editing.col === c.key;
                  const highlighted = rowSelected && selectedColumns.includes(c.key);
                  return (
                    <td
                      key={c.key}
                      onDoubleClick={() => setEditing({ row: rowIndex, col: c.key })}
                      className={`whitespace-nowrap px-3 py-1.5 text-right tabular-nums ${highlighted ? "bg-blue-50" : ""}`}
                    >
                      {isEditing ? (
                        <input
                          autoFocus
                          defaultValue={r.values[c.key] ?? ""}
                          onBlur={(e) => saveEdit(rowIndex, c.key, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") e.currentTarget.blur();
                            if (e.key === "Escape") setEditing(null);
                          }}
                          className="w-24 rounded border px-1 text-right"
                        />
                      ) : r.isSection ? (
                        ""
                      ) : (
                        formatNumber(r.values[c.key])
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
