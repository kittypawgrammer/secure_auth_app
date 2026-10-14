"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { parseWorkbook, type ParsedSheet } from "./parseWorkbook";

const STORAGE_KEY = "mis-workbook";

export function useWorkbook() {
  // Load the last saved workbook when the page opens (this hook only runs in the browser)
  const [sheets, setSheets] = useState<ParsedSheet[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  });

  // Save automatically whenever anything changes
  useEffect(() => {
    if (sheets.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(sheets));
  }, [sheets]);

  // Upload: replace everything with the new file
  async function upload(file: File) {
    setSheets(await parseWorkbook(file));
  }

  // New tab: empty sheet with a "Particulars"-style list of rows to fill later
  function addSheet(name: string) {
    if (sheets.some((s) => s.name === name)) throw new Error("Tab already exists");
    setSheets([...sheets, { name, title: [], columns: [], rows: [] }]);
  }

  // New column: add to columns + an empty value on every row
  function addColumn(sheetName: string, columnName: string) {
    setSheets(sheets.map((s) => {
      if (s.name !== sheetName) return s;
      if (s.columns.some((c) => c.key === columnName)) throw new Error("Column already exists");
      return {
        ...s,
        columns: [...s.columns, { key: columnName, path: [columnName] }],
        rows: s.rows.map((r) => ({ ...r, values: { ...r.values, [columnName]: null } })),
      };
    }));
  }

  // New row (needed for new tabs)
  function addRow(sheetName: string, label: string) {
    setSheets(sheets.map((s) => s.name !== sheetName ? s : {
      ...s,
      rows: [...s.rows, {
        label,
        isSection: false,
        values: Object.fromEntries(s.columns.map((c) => [c.key, null])),
      }],
    }));
  }

  // Edit one cell
  function updateCell(sheetName: string, rowIndex: number, columnKey: string, value: number | null) {
    setSheets(sheets.map((s) => s.name !== sheetName ? s : {
      ...s,
      rows: s.rows.map((r, i) => i !== rowIndex ? r : {
        ...r,
        values: { ...r.values, [columnKey]: value },
      }),
    }));
  }

  // Download everything back as .xlsx (new tabs/columns included)
  function download(fileName = "MIS.xlsx") {
    const wb = XLSX.utils.book_new();
    for (const s of sheets) {
      const header = ["Particulars", ...s.columns.map((c) => c.key)];
      const body = s.rows.map((r) => [r.label, ...s.columns.map((c) => r.values[c.key])]);
      const ws = XLSX.utils.aoa_to_sheet([...s.title.map((t) => [t]), header, ...body]);
      XLSX.utils.book_append_sheet(wb, ws, s.name.slice(0, 31)); // Excel tab limit = 31 chars
    }
    XLSX.writeFile(wb, fileName);
  }

  return { sheets, upload, addSheet, addColumn, addRow, updateCell, download };
}
