import * as XLSX from "xlsx";

export type Column = { key: string; path: string[] };   // path = header levels
export type Row = {
  label: string;
  isSection: boolean;                                    // text row with no numbers, e.g. "Income"
  values: Record<string, number | null>;                 // column key -> number
};
export type ParsedSheet = { name: string; title: string[]; columns: Column[]; rows: Row[] };

// Entry point: File (from upload, later from SharePoint) -> sheets
export async function parseWorkbook(file: File | ArrayBuffer): Promise<ParsedSheet[]> {
  const data = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
  const wb = XLSX.read(data);
  return wb.SheetNames.map((name) => parseSheet(name, wb.Sheets[name]));
}

// 1. Turn the sheet into two grids: text (what you see) and numbers
function readGrid(ws: XLSX.WorkSheet) {
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  const text: string[][] = [];
  const nums: (number | null)[][] = [];

  for (let r = range.s.r; r <= range.e.r; r++) {
    const tRow: string[] = [];
    const nRow: (number | null)[] = [];
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      tRow.push(cell ? String(cell.w ?? cell.v ?? "").trim() : "");
      nRow.push(cell?.t === "n" ? (cell.v as number) : null); // errors (#DIV/0!) -> null
    }
    text.push(tRow);
    nums.push(nRow);
  }

  // Merged cells only store text in the first cell; copy it across the merge
  for (const m of ws["!merges"] ?? []) {
    const value = text[m.s.r - range.s.r][m.s.c - range.s.c];
    for (let r = m.s.r; r <= m.e.r; r++)
      for (let c = m.s.c; c <= m.e.c; c++) text[r - range.s.r][c - range.s.c] = value;
  }
  return { text, nums };
}

function parseSheet(name: string, ws: XLSX.WorkSheet): ParsedSheet {
  const { text, nums } = readGrid(ws);
  const width = Math.max(0, ...text.map((r) => r.length));
  const isTextOnly = (r: number, c: number) => text[r][c] !== "" && nums[r][c] === null;

  // 2. Label column = the column with the most text-only cells
  let labelCol = 0, best = -1;
  for (let c = 0; c < width; c++) {
    const count = text.filter((_, r) => isTextOnly(r, c)).length;
    if (count > best) { best = count; labelCol = c; }
  }

  // 3. First data row = first row with a label AND at least one number
  const firstData = text.findIndex(
    (row, r) => row[labelCol] !== "" && nums[r].some((n, c) => c !== labelCol && n !== null)
  );
  if (firstData === -1) return { name, title: [], columns: [], rows: [] };

  // 4. Header rows = rows above data whose other cells hold different texts
  //    (a merged title repeats one text everywhere, so it's not a header)
  const headerRows: number[] = [];
  const title: string[] = [];
  for (let r = 0; r < firstData; r++) {
    const others = text[r].filter((t, c) => c !== labelCol && t !== "");
    if (new Set(others).size > 1) headerRows.push(r);
    else {
      const t = text[r].find((x) => x !== "");
      if (t) title.push(t);
    }
  }

  // 5. Columns: name = header texts top to bottom, e.g. ["Apr-26", "Actual 2026"]
  const columns: (Column & { index: number })[] = [];
  const used = new Map<string, number>();
  for (let c = 0; c < width; c++) {
    if (c === labelCol) continue;
    const path = headerRows.map((r) => text[r][c]).filter((t, i, a) => t !== "" && t !== a[i - 1]);
    const hasNumbers = nums.slice(firstData).some((row) => row[c] !== null);
    if (path.length === 0 && !hasNumbers) continue;        // empty spacer column

    let key = path.join(" | ") || `Column ${c + 1}`;
    const n = (used.get(key) ?? 0) + 1;
    used.set(key, n);
    if (n > 1) key = `${key} (${n})`;                       // keep keys unique
    columns.push({ key, path, index: c });
  }

  // 6. Rows: every labelled row from the first data row down
  const rows: Row[] = [];
  for (let r = firstData; r < text.length; r++) {
    const label = text[r][labelCol];
    if (!label) continue;
    const values: Record<string, number | null> = {};
    for (const col of columns) values[col.key] = nums[r][col.index];
    rows.push({ label, values, isSection: Object.values(values).every((v) => v === null) });
  }

  return { name, title, columns: columns.map(({ key, path }) => ({ key, path })), rows };
}
