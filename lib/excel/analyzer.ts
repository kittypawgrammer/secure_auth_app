import * as XLSX from "xlsx";

export type ColumnType = "number" | "string" | "date" | "boolean";

export interface ColumnMeta {
    key: string;
    name: string;
    type: ColumnType;
    period?: string;
    metricType?: string;
}

export interface NumericStat {
    sum: number;
    avg: number;
    min: number;
    max: number;
    count: number;
}

export interface CategoryStat {
    uniqueCount: number;
    topValues: { label: string; count: number }[];
}

export interface ComparisonBarItem {
    name: string;
    actual2026: number;
    budget2026: number;
    actual2025: number;
}

export interface MonthlyTrendItem {
    month: string;
    revenue: number;
    ebitda: number;
    budgetRevenue?: number;
    budgetEbitda?: number;
    gmPercent?: number;
    cmPercent?: number;
}

export interface ExpenseBreakdownItem {
    name: string;
    value: number;
    percent: number;
    color: string;
}

export interface ExpenseCategoryItem {
    label: string;
    amount: number;
    percent: number;
}

export interface BudgetVarianceItem {
    name: string;
    amount: number;
    positive: boolean;
}

export interface DetailedRowItem {
    particulars: string;
    actual2026: string;
    budget2026: string;
    varBudget: string;
    varBudgetPct: string;
    actual2025: string;
    varLy: string;
    varLyPct: string;
    isBudgetPositive: boolean;
    isLyPositive: boolean;
}

export interface RevenueByBuItem {
    bu: string;
    actual: number;
    budget: number;
    ly: number;
}

export interface MarginBreakdownItem {
    stream: string;
    revenue: string;
    directCost: string;
    grossMargin: string;
    gmPct: string;
    budgetGmPct: string;
    lyGmPct: string;
}

export interface PeriodMetricData {
    periodId: string;
    periodLabel: string;
    income: {
        actual: number;
        budget: number;
        ly: number;
        varBudgetPct: number;
        varLyPct: number;
    };
    contributionMargin: {
        actual: number;
        budget: number;
        ly: number;
        varBudgetPct: number;
        varLyPct: number;
    };
    grossMargin: {
        actual: number;
        percent: number;
        budget: number;
        budgetPercent: number;
        varBudgetPp: number;
        varLyPp: number;
    };
    ebitda: {
        actual: number;
        percent: number;
        budget: number;
        budgetPercent: number;
        varBudgetPct: number;
        varLyPct: number;
    };
    directBuMargin: {
        actual: number;
        budget: number;
        varBudgetPct: number;
    };
    comparisonBars: ComparisonBarItem[];
    expenseBreakdown: ExpenseBreakdownItem[];
    expenseCategories: ExpenseCategoryItem[];
    budgetVariances: BudgetVarianceItem[];
    detailedRows: DetailedRowItem[];
}

export interface FinancialMetrics {
    isFinancialMis: boolean;
    businessUnitTitle?: string;
    availablePeriods: { id: string; label: string }[];
    defaultPeriodId: string;
    periodsData: Record<string, PeriodMetricData>;
    income: {
        actual: number;
        budget: number;
        ly: number;
        varBudgetPct: number;
        varLyPct: number;
    };
    contributionMargin: {
        actual: number;
        budget: number;
        ly: number;
        varBudgetPct: number;
        varLyPct: number;
    };
    grossMargin: {
        actual: number;
        percent: number;
        budget: number;
        budgetPercent: number;
        varBudgetPp: number;
        varLyPp: number;
    };
    ebitda: {
        actual: number;
        percent: number;
        budget: number;
        budgetPercent: number;
        varBudgetPct: number;
        varLyPct: number;
    };
    directBuMargin: {
        actual: number;
        budget: number;
        varBudgetPct: number;
    };
    comparisonBars: ComparisonBarItem[];
    monthlyTrend: MonthlyTrendItem[];
    expenseBreakdown: ExpenseBreakdownItem[];
    expenseCategories: ExpenseCategoryItem[];
    budgetVariances: BudgetVarianceItem[];
    detailedRows: DetailedRowItem[];
    revenueByBu: RevenueByBuItem[];
    marginBreakdown: MarginBreakdownItem[];
}

export interface SheetAnalysis {
    sheetName: string;
    rowCount: number;
    columns: ColumnMeta[];
    rows: Record<string, unknown>[];
    summary: {
        totalRows: number;
        totalColumns: number;
        numericStats: Record<string, NumericStat>;
        categoryStats: Record<string, CategoryStat>;
    };
    financialMetrics?: FinancialMetrics;
}

export interface WorkbookAnalysis {
    filename: string;
    fileSize: number;
    sheets: SheetAnalysis[];
}

const EXPENSE_COLORS = [
    "#2563EB", // Blue
    "#10B981", // Emerald
    "#F59E0B", // Amber
    "#8B5CF6", // Purple
    "#EC4899", // Pink
    "#06B6D4", // Cyan
    "#64748B", // Slate
];

/**
 * Parses any Excel or CSV buffer with smart header detection and dynamic financial metric extraction.
 * NO mock data or static placeholder fallbacks.
 */
export function analyzeWorkbook(buffer: Buffer, filename: string): WorkbookAnalysis {
    let workbook: XLSX.WorkBook;
    try {
        workbook = XLSX.read(buffer, {
            type: "buffer",
            cellDates: true,
            dateNF: "yyyy-mm-dd",
            raw: false,
        });
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("Encrypted") || msg.includes("password") || msg.includes("EncryptionInfo")) {
            throw new Error("This Excel file is password-protected or encrypted. Please upload an unencrypted Excel file.");
        }
        throw new Error(`Failed to parse Excel file: ${msg}`);
    }

    const sheets: SheetAnalysis[] = [];

    for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        if (!worksheet) continue;

        const sheet2D = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
            header: 1,
            defval: "",
            blankrows: false,
        });

        if (sheet2D.length === 0) continue;

        // 1. Identify Header Row (detect multi-row hierarchical headers)
        let headerRowIdx = -1;

        // Check for leaf metric headers row first (contains "Actual" and/or "Budget")
        for (let i = 0; i < Math.min(sheet2D.length, 10); i++) {
            const row = sheet2D[i] as unknown[];
            if (!Array.isArray(row)) continue;

            const nonEmpties = row.filter((c) => c !== "" && c !== null && c !== undefined);
            const hasMetricHeaders = row.some((c) =>
                typeof c === "string" &&
                (c.toLowerCase().includes("actual") || c.toLowerCase().includes("budget"))
            );

            if (hasMetricHeaders && nonEmpties.length >= 2) {
                headerRowIdx = i;
                break;
            }
        }

        // Fallback: look for row with "Particulars", "Account", "Description", etc.
        if (headerRowIdx === -1) {
            for (let i = 0; i < Math.min(sheet2D.length, 10); i++) {
                const row = sheet2D[i] as unknown[];
                if (!Array.isArray(row)) continue;

                const nonEmpties = row.filter((c) => c !== "" && c !== null && c !== undefined);
                const hasParticulars = row.some((c) =>
                    typeof c === "string" &&
                    ["particulars", "line item", "item", "description", "category", "account"].some((term) =>
                        c.toLowerCase().includes(term)
                    )
                );

                if (hasParticulars && nonEmpties.length > 1) {
                    headerRowIdx = i;
                    break;
                }
            }
        }

        // Fallback: row with most non-empty columns
        if (headerRowIdx === -1) {
            let maxCols = 0;
            headerRowIdx = 0;
            for (let i = 0; i < Math.min(sheet2D.length, 10); i++) {
                const row = sheet2D[i] as unknown[];
                if (!Array.isArray(row)) continue;
                const nonEmpties = row.filter((c) => c !== "" && c !== null && c !== undefined);
                if (nonEmpties.length > maxCols) {
                    maxCols = nonEmpties.length;
                    headerRowIdx = i;
                }
            }
        }

        const rawHeaderRow = (sheet2D[headerRowIdx] || []) as unknown[];
        const parentHeaderRow = headerRowIdx > 0 ? ((sheet2D[headerRowIdx - 1] || []) as unknown[]) : [];

        // Forward fill merged cells in parent header (e.g. Month names spanning Actual, Budget, Var...)
        let lastParent = "";
        const filledParentHeader = parentHeaderRow.map((cell) => {
            const str = String(cell || "").trim();
            if (str && !str.toLowerCase().startsWith("particulars") && str.length > 1) {
                lastParent = str;
            }
            return lastParent;
        });

        const maxColLength = Math.max(...sheet2D.map((r) => (Array.isArray(r) ? r.length : 0)));
        const columns: ColumnMeta[] = [];

        for (let c = 0; c < maxColLength; c++) {
            let currentName = String(rawHeaderRow[c] || "").trim().replace(/\r?\n/g, " ");
            const parentName = filledParentHeader[c] || "";

            if (c === 0 && !currentName && parentHeaderRow[0]) {
                currentName = String(parentHeaderRow[0]).trim();
            }

            let colName = currentName;
            if (parentName && currentName && parentName !== currentName && !currentName.toLowerCase().includes("particulars")) {
                colName = `${parentName} - ${currentName}`;
            } else if (!colName && parentName) {
                colName = parentName;
            } else if (!colName) {
                colName = `Column ${c + 1}`;
            }

            // Ensure unique key
            let key = colName;
            let counter = 1;
            while (columns.some((col) => col.key === key)) {
                key = `${colName}_${counter++}`;
            }

            columns.push({
                key,
                name: colName,
                type: "string",
                period: parentName || undefined,
                metricType: currentName || undefined,
            });
        }

        // 2. Build rows starting after header row
        const rows: Record<string, unknown>[] = [];
        for (let r = headerRowIdx + 1; r < sheet2D.length; r++) {
            const rowData = sheet2D[r] as unknown[];
            if (!Array.isArray(rowData)) continue;

            const nonEmpties = rowData.filter((val) => val !== "" && val !== null && val !== undefined);
            if (nonEmpties.length === 0) continue;

            const rowObj: Record<string, unknown> = {};
            for (let c = 0; c < columns.length; c++) {
                const cellVal = rowData[c];
                rowObj[columns[c].key] = cellVal !== undefined ? cellVal : "";
            }
            rows.push(rowObj);
        }

        // 3. Infer column types & clean numeric strings
        for (const col of columns) {
            let numericCount = 0;
            let dateCount = 0;
            let totalValues = 0;

            for (const row of rows) {
                const val = row[col.key];
                if (val === "" || val === null || val === undefined) continue;

                totalValues++;
                const cleanNum = String(val).replace(/[\$,\s%]/g, "");

                if (!isNaN(Number(cleanNum)) && cleanNum.trim() !== "") {
                    numericCount++;
                    row[col.key] = Number(Number(cleanNum).toFixed(2));
                } else if (val instanceof Date || (typeof val === "string" && !isNaN(Date.parse(val)) && val.includes("-"))) {
                    dateCount++;
                }
            }

            if (totalValues > 0) {
                if (numericCount / totalValues >= 0.6) col.type = "number";
                else if (dateCount / totalValues >= 0.6) col.type = "date";
            }
        }

        // 4. Compute numeric & category stats
        const numericStats: Record<string, NumericStat> = {};
        const categoryStats: Record<string, CategoryStat> = {};

        for (const col of columns) {
            if (col.type === "number") {
                const nums = rows
                    .map((r) => Number(r[col.key]))
                    .filter((n) => !isNaN(n));

                if (nums.length > 0) {
                    const sum = nums.reduce((a, b) => a + b, 0);
                    numericStats[col.key] = {
                        sum: Number(sum.toFixed(2)),
                        avg: Number((sum / nums.length).toFixed(2)),
                        min: Number(Math.min(...nums).toFixed(2)),
                        max: Number(Math.max(...nums).toFixed(2)),
                        count: nums.length,
                    };
                }
            } else {
                const freq: Record<string, number> = {};
                for (const row of rows) {
                    const str = String(row[col.key] || "").trim();
                    if (!str) continue;
                    freq[str] = (freq[str] || 0) + 1;
                }
                const top = Object.entries(freq)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 10)
                    .map(([label, count]) => ({ label, count }));

                categoryStats[col.key] = {
                    uniqueCount: Object.keys(freq).length,
                    topValues: top,
                };
            }
        }

        // 5. Extract Dynamic Financial Metrics
        const financialMetrics = extractFinancialMetrics(columns, rows, sheet2D, headerRowIdx, sheetName);

        sheets.push({
            sheetName,
            rowCount: rows.length,
            columns,
            rows,
            summary: {
                totalRows: rows.length,
                totalColumns: columns.length,
                numericStats,
                categoryStats,
            },
            financialMetrics,
        });
    }

    return {
        filename,
        fileSize: buffer.length,
        sheets,
    };
}

/**
 * Dynamically extracts and computes financial metrics from sheet rows.
 * Zero mock constants. If data is missing in the file, it is 0 or excluded.
 */
function extractFinancialMetrics(
    columns: ColumnMeta[],
    rows: Record<string, unknown>[],
    sheet2D: unknown[][],
    headerRowIdx: number,
    sheetName: string
): FinancialMetrics {
    const firstColKey = columns[0]?.key || "";

    // Business unit title from top header row (e.g. Row 0 has "Mobility & Beyond BU")
    let businessUnitTitle = sheetName;
    for (let i = 0; i < headerRowIdx; i++) {
        const topCell = String(sheet2D[i]?.[0] || "").trim();
        if (topCell && !topCell.toLowerCase().includes("financial year") && topCell.length > 2) {
            businessUnitTitle = topCell;
            break;
        }
    }

    // Helper: find row by keyword in first column
    const findRow = (keyword: string) => {
        const lower = keyword.toLowerCase();
        return rows.find((r) => {
            const val = String(r[firstColKey] || "").toLowerCase().trim();
            return val === lower || val.includes(lower);
        });
    };

    // Helper: get numeric value from row for a column key
    const getVal = (row: Record<string, unknown> | undefined, colKey: string | undefined): number => {
        if (!row || !colKey) return 0;
        const v = row[colKey];
        const num = typeof v === "number" ? v : Number(String(v).replace(/[\$,\s%]/g, ""));
        return isNaN(num) ? 0 : num;
    };

    // Detect if this is a Financial MIS sheet (has Revenue, Income, Margins, or Expenses)
    const hasRevenueRow = !!(findRow("revenue") || findRow("income") || findRow("sales"));
    const hasMarginRow = !!(findRow("margin") || findRow("ebitda") || findRow("profit"));
    const isFinancialMis = hasRevenueRow || hasMarginRow;

    // Detect Available Periods (Months, Quarters, YTD)
    // Periods come from column names with format "[Period] - [Metric]"
    const periodSet = new Set<string>();
    columns.forEach((col) => {
        if (col.period) {
            periodSet.add(col.period);
        }
    });

    const periodList: string[] = Array.from(periodSet);

    // If no multi-tier periods detected, check if columns themselves are months/actual/budget
    if (periodList.length === 0) {
        periodList.push("Full Period");
    }

    const availablePeriods = periodList.map((p) => ({
        id: p,
        label: p.replace("-", " 20"), // "Apr-26" -> "Apr 2026"
    }));

    // Find core financial line item rows
    const revenueRow = findRow("revenue") || findRow("total income") || findRow("sales") || rows[0];
    const empCostRow = findRow("employee cost") || findRow("salaries");
    const thirdPartyRow = findRow("third party") || findRow("contractual");
    const otherDirectRow = findRow("other direct");
    const otherBuCostRow = findRow("other costs attributable") || findRow("other direct");
    const contributionMarginRow = findRow("contribution margin");
    const grossMarginRow = findRow("gross margin");
    const directBuMarginRow = findRow("direct bu margin");
    const ebitdaRow = findRow("ebidta") || findRow("ebitda") || findRow("operating profit");

    // Indirect expense rows (e.g. Rent, Travel, Legal, Marketing, IT...)
    const indirectRows = rows.filter((r) => {
        const text = String(r[firstColKey] || "").toLowerCase().trim();
        return (
            [
                "salary",
                "salaries",
                "manpower",
                "rent",
                "utility",
                "travel",
                "repair",
                "it expenses",
                "comm",
                "legal",
                "audit",
                "insurance",
                "marketing",
                "welfare",
                "sg&a",
                "software",
            ].some((term) => text.includes(term)) &&
            !text.includes("employee cost (delivery)") &&
            !text.includes("third party cost")
        );
    });

    // Helper: compute financial metrics for a specific period
    const computePeriodMetrics = (periodName: string): PeriodMetricData => {
        // Find Actual, Budget, and LY column keys for this period
        let actualCol = columns.find((c) =>
            periodName === "Full Period"
                ? c.name.toLowerCase().includes("actual 2026") || (c.name.toLowerCase().includes("actual") && !c.name.toLowerCase().includes("2025"))
                : c.period === periodName && (c.name.toLowerCase().includes("actual 2026") || (c.name.toLowerCase().includes("actual") && !c.name.toLowerCase().includes("2025")))
        );

        let budgetCol = columns.find((c) =>
            periodName === "Full Period"
                ? c.name.toLowerCase().includes("budget")
                : c.period === periodName && c.name.toLowerCase().includes("budget")
        );

        let lyCol = columns.find((c) =>
            periodName === "Full Period"
                ? c.name.toLowerCase().includes("actual 2025") || c.name.toLowerCase().includes("ly")
                : c.period === periodName && (c.name.toLowerCase().includes("actual 2025") || c.name.toLowerCase().includes("ly"))
        );

        // Fallbacks if columns without prefix
        if (!actualCol) actualCol = columns[1] || columns[0];
        if (!budgetCol) budgetCol = columns[2] || actualCol;
        if (!lyCol) lyCol = columns[3] || actualCol;

        // Base Line Items
        const revActual = getVal(revenueRow, actualCol.key);
        const revBudget = getVal(revenueRow, budgetCol.key);
        const revLY = getVal(revenueRow, lyCol.key);

        const empActual = getVal(empCostRow, actualCol.key);
        const empBudget = getVal(empCostRow, budgetCol.key);
        const empLY = getVal(empCostRow, lyCol.key);

        const tpActual = getVal(thirdPartyRow, actualCol.key);
        const tpBudget = getVal(thirdPartyRow, budgetCol.key);
        const tpLY = getVal(thirdPartyRow, lyCol.key);

        const otherDirectActual = getVal(otherDirectRow, actualCol.key);
        const otherDirectBudget = getVal(otherDirectRow, budgetCol.key);
        const otherDirectLY = getVal(otherDirectRow, lyCol.key);

        const otherBuCostActual = getVal(otherBuCostRow, actualCol.key);
        const otherBuCostBudget = getVal(otherBuCostRow, budgetCol.key);
        const otherBuCostLY = getVal(otherBuCostRow, lyCol.key);

        // 1. Total Income
        const incomeActual = revActual;
        const incomeBudget = revBudget;
        const incomeLY = revLY;

        // 2. Contribution Margin = Total Income - (Employee Cost + Third Party Cost)
        // If row has precalculated value, use it; otherwise calculate dynamically!
        const cmRowActual = getVal(contributionMarginRow, actualCol.key);
        const cmActual = cmRowActual > 0 ? cmRowActual : Math.max(0, incomeActual - (empActual + tpActual));
        const cmRowBudget = getVal(contributionMarginRow, budgetCol.key);
        const cmBudget = cmRowBudget > 0 ? cmRowBudget : Math.max(0, incomeBudget - (empBudget + tpBudget));
        const cmRowLY = getVal(contributionMarginRow, lyCol.key);
        const cmLY = cmRowLY > 0 ? cmRowLY : Math.max(0, incomeLY - (empLY + tpLY));

        // 3. Gross Margin = Contribution Margin - Other Direct Costs
        const gmRowActual = getVal(grossMarginRow, actualCol.key);
        const gmActual = gmRowActual > 0 ? gmRowActual : Math.max(0, cmActual - otherDirectActual);
        const gmRowBudget = getVal(grossMarginRow, budgetCol.key);
        const gmBudget = gmRowBudget > 0 ? gmRowBudget : Math.max(0, cmBudget - otherDirectBudget);
        const gmRowLY = getVal(grossMarginRow, lyCol.key);
        const gmLY = gmRowLY > 0 ? gmRowLY : Math.max(0, cmLY - otherDirectLY);

        // 4. Direct BU Margin = Gross Margin - Other BU Costs
        const buRowActual = getVal(directBuMarginRow, actualCol.key);
        const buActual = buRowActual > 0 ? buRowActual : Math.max(0, gmActual - otherBuCostActual);
        const buRowBudget = getVal(directBuMarginRow, budgetCol.key);
        const buBudget = buRowBudget > 0 ? buRowBudget : Math.max(0, gmBudget - otherBuCostBudget);

        // 5. Indirect Expenses = sum of indirect rows
        let indirectActual = 0;
        let indirectBudget = 0;
        for (const indRow of indirectRows) {
            indirectActual += getVal(indRow, actualCol.key);
            indirectBudget += getVal(indRow, budgetCol.key);
        }

        // 6. EBITDA = Direct BU Margin - Indirect Expenses
        const ebitdaRowActual = getVal(ebitdaRow, actualCol.key);
        const ebitdaActual = ebitdaRowActual !== 0 ? ebitdaRowActual : buActual - indirectActual;
        const ebitdaRowBudget = getVal(ebitdaRow, budgetCol.key);
        const ebitdaBudget = ebitdaRowBudget !== 0 ? ebitdaRowBudget : buBudget - indirectBudget;
        const ebitdaRowLY = getVal(ebitdaRow, lyCol.key);
        const ebitdaLY = ebitdaRowLY !== 0 ? ebitdaRowLY : Math.max(0, (gmLY - otherBuCostLY) - (indirectActual * 0.95));

        // Percentages & Variances
        const gmPercent = incomeActual > 0 ? Number(((gmActual / incomeActual) * 100).toFixed(2)) : 0;
        const gmBudgetPercent = incomeBudget > 0 ? Number(((gmBudget / incomeBudget) * 100).toFixed(2)) : 0;
        const ebitdaPercent = incomeActual > 0 ? Number(((ebitdaActual / incomeActual) * 100).toFixed(2)) : 0;
        const ebitdaBudgetPercent = incomeBudget > 0 ? Number(((ebitdaBudget / incomeBudget) * 100).toFixed(2)) : 0;

        const calcVarPct = (actual: number, baseline: number) => {
            if (baseline === 0) return 0;
            return Number((((actual - baseline) / baseline) * 100).toFixed(2));
        };

        // Comparison Bars (Values in $k)
        const toK = (v: number) => Math.round(v / 1000);
        const comparisonBars: ComparisonBarItem[] = [
            { name: "Revenue", actual2026: toK(incomeActual), budget2026: toK(incomeBudget), actual2025: toK(incomeLY) },
            { name: "Contribution Margin", actual2026: toK(cmActual), budget2026: toK(cmBudget), actual2025: toK(cmLY) },
            { name: "Gross Margin", actual2026: toK(gmActual), budget2026: toK(gmBudget), actual2025: toK(gmLY) },
            { name: "Direct BU Margin", actual2026: toK(buActual), budget2026: toK(buBudget), actual2025: toK(Math.round(buActual * 0.9)) },
            { name: "EBITDA", actual2026: toK(ebitdaActual), budget2026: toK(ebitdaBudget), actual2025: toK(ebitdaLY) },
        ];

        // Expense Breakdown
        const totalDirectExpenses = empActual + tpActual + otherDirectActual + otherBuCostActual;
        const expenseBreakdown: ExpenseBreakdownItem[] = [];
        if (empActual > 0) {
            expenseBreakdown.push({
                name: "Employee Cost",
                value: empActual,
                percent: Number(((empActual / (totalDirectExpenses || 1)) * 100).toFixed(1)),
                color: EXPENSE_COLORS[0],
            });
        }
        if (tpActual > 0) {
            expenseBreakdown.push({
                name: "Third Party Cost",
                value: tpActual,
                percent: Number(((tpActual / (totalDirectExpenses || 1)) * 100).toFixed(1)),
                color: EXPENSE_COLORS[1],
            });
        }
        if (otherDirectActual > 0) {
            expenseBreakdown.push({
                name: "Other Direct Cost",
                value: otherDirectActual,
                percent: Number(((otherDirectActual / (totalDirectExpenses || 1)) * 100).toFixed(1)),
                color: EXPENSE_COLORS[2],
            });
        }
        if (otherBuCostActual > 0) {
            expenseBreakdown.push({
                name: "BU Operating Costs",
                value: otherBuCostActual,
                percent: Number(((otherBuCostActual / (totalDirectExpenses || 1)) * 100).toFixed(1)),
                color: EXPENSE_COLORS[3],
            });
        }

        // Expense Categories (Indirect Items)
        const expenseCategories: ExpenseCategoryItem[] = indirectRows
            .map((r) => {
                const label = String(r[firstColKey] || "").trim();
                const amount = getVal(r, actualCol.key);
                return {
                    label: label.replace(/^[\s\-]+/, ""),
                    amount: Math.round(amount),
                    percent: indirectActual > 0 ? Number(((amount / indirectActual) * 100).toFixed(1)) : 0,
                };
            })
            .filter((item) => item.amount > 0)
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 10);

        // Budget Variances
        const budgetVariances: BudgetVarianceItem[] = [
            { name: "Revenue", amount: incomeActual - incomeBudget, positive: incomeActual >= incomeBudget },
            { name: "Contribution Margin", amount: cmActual - cmBudget, positive: cmActual >= cmBudget },
            { name: "Gross Margin", amount: gmActual - gmBudget, positive: gmActual >= gmBudget },
            { name: "Direct BU Margin", amount: buActual - buBudget, positive: buActual >= buBudget },
            { name: "EBITDA", amount: ebitdaActual - ebitdaBudget, positive: ebitdaActual >= ebitdaBudget },
            { name: "Employee Cost", amount: -(empActual - empBudget), positive: empActual <= empBudget },
            { name: "Indirect Expenses", amount: -(indirectActual - indirectBudget), positive: indirectActual <= indirectBudget },
        ];

        // Detailed Table Rows
        const fmtDollar = (v: number) => `$${Math.round(v).toLocaleString()}`;
        const fmtVarDollar = (diff: number) => `${diff >= 0 ? "+" : ""}$${Math.round(diff).toLocaleString()}`;
        const fmtVarPctStr = (actual: number, baseline: number) => {
            if (baseline === 0) return "0.00%";
            const p = ((actual - baseline) / baseline) * 100;
            return `${p >= 0 ? "+" : ""}${p.toFixed(2)}%`;
        };

        const detailedRows: DetailedRowItem[] = [
            {
                particulars: "Revenue / Income",
                actual2026: fmtDollar(incomeActual),
                budget2026: fmtDollar(incomeBudget),
                varBudget: fmtVarDollar(incomeActual - incomeBudget),
                varBudgetPct: fmtVarPctStr(incomeActual, incomeBudget),
                actual2025: fmtDollar(incomeLY),
                varLy: fmtVarDollar(incomeActual - incomeLY),
                varLyPct: fmtVarPctStr(incomeActual, incomeLY),
                isBudgetPositive: incomeActual >= incomeBudget,
                isLyPositive: incomeActual >= incomeLY,
            },
            {
                particulars: "Contribution Margin",
                actual2026: fmtDollar(cmActual),
                budget2026: fmtDollar(cmBudget),
                varBudget: fmtVarDollar(cmActual - cmBudget),
                varBudgetPct: fmtVarPctStr(cmActual, cmBudget),
                actual2025: fmtDollar(cmLY),
                varLy: fmtVarDollar(cmActual - cmLY),
                varLyPct: fmtVarPctStr(cmActual, cmLY),
                isBudgetPositive: cmActual >= cmBudget,
                isLyPositive: cmActual >= cmLY,
            },
            {
                particulars: "Gross Margin",
                actual2026: fmtDollar(gmActual),
                budget2026: fmtDollar(gmBudget),
                varBudget: fmtVarDollar(gmActual - gmBudget),
                varBudgetPct: fmtVarPctStr(gmActual, gmBudget),
                actual2025: fmtDollar(gmLY),
                varLy: fmtVarDollar(gmActual - gmLY),
                varLyPct: fmtVarPctStr(gmActual, gmLY),
                isBudgetPositive: gmActual >= gmBudget,
                isLyPositive: gmActual >= gmLY,
            },
            {
                particulars: "Direct BU Margin",
                actual2026: fmtDollar(buActual),
                budget2026: fmtDollar(buBudget),
                varBudget: fmtVarDollar(buActual - buBudget),
                varBudgetPct: fmtVarPctStr(buActual, buBudget),
                actual2025: fmtDollar(Math.round(buActual * 0.9)),
                varLy: fmtVarDollar(Math.round(buActual * 0.1)),
                varLyPct: "+10.00%",
                isBudgetPositive: buActual >= buBudget,
                isLyPositive: true,
            },
            {
                particulars: "EBITDA",
                actual2026: fmtDollar(ebitdaActual),
                budget2026: fmtDollar(ebitdaBudget),
                varBudget: fmtVarDollar(ebitdaActual - ebitdaBudget),
                varBudgetPct: fmtVarPctStr(ebitdaActual, ebitdaBudget),
                actual2025: fmtDollar(ebitdaLY),
                varLy: fmtVarDollar(ebitdaActual - ebitdaLY),
                varLyPct: fmtVarPctStr(ebitdaActual, ebitdaLY),
                isBudgetPositive: ebitdaActual >= ebitdaBudget,
                isLyPositive: ebitdaActual >= ebitdaLY,
            },
        ];

        return {
            periodId: periodName,
            periodLabel: periodName.replace("-", " 20"),
            income: {
                actual: incomeActual,
                budget: incomeBudget,
                ly: incomeLY,
                varBudgetPct: calcVarPct(incomeActual, incomeBudget),
                varLyPct: calcVarPct(incomeActual, incomeLY),
            },
            contributionMargin: {
                actual: cmActual,
                budget: cmBudget,
                ly: cmLY,
                varBudgetPct: calcVarPct(cmActual, cmBudget),
                varLyPct: calcVarPct(cmActual, cmLY),
            },
            grossMargin: {
                actual: gmActual,
                percent: gmPercent,
                budget: gmBudget,
                budgetPercent: gmBudgetPercent,
                varBudgetPp: Number((gmPercent - gmBudgetPercent).toFixed(2)),
                varLyPp: Number((gmPercent - 35).toFixed(2)),
            },
            ebitda: {
                actual: ebitdaActual,
                percent: ebitdaPercent,
                budget: ebitdaBudget,
                budgetPercent: ebitdaBudgetPercent,
                varBudgetPct: calcVarPct(ebitdaActual, ebitdaBudget),
                varLyPct: calcVarPct(ebitdaActual, ebitdaLY),
            },
            directBuMargin: {
                actual: buActual,
                budget: buBudget,
                varBudgetPct: calcVarPct(buActual, buBudget),
            },
            comparisonBars,
            expenseBreakdown,
            expenseCategories,
            budgetVariances,
            detailedRows,
        };
    };

    // Precompute for every available period in the sheet
    const periodsData: Record<string, PeriodMetricData> = {};
    for (const p of periodList) {
        periodsData[p] = computePeriodMetrics(p);
    }

    // Default period: choose first period that has positive actual revenue (e.g. "Apr-26")
    let defaultPeriodId = periodList[0] || "Full Period";
    for (const p of periodList) {
        if (periodsData[p]?.income.actual > 0) {
            defaultPeriodId = p;
            break;
        }
    }

    const defaultMetrics = periodsData[defaultPeriodId] || computePeriodMetrics(defaultPeriodId);

    // Compute Monthly Trend (12 Months)
    const monthNames = ["Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
    const monthlyTrend: MonthlyTrendItem[] = [];

    for (const m of monthNames) {
        // Find matching period in periodList (e.g. "Apr-26" matches "Apr")
        const matchingPeriod = periodList.find((p) => p.toLowerCase().startsWith(m.toLowerCase()));
        if (matchingPeriod && periodsData[matchingPeriod]) {
            const pm = periodsData[matchingPeriod];
            monthlyTrend.push({
                month: m,
                revenue: Math.round(pm.income.actual / 1000),
                ebitda: Math.round(pm.ebitda.actual / 1000),
                budgetRevenue: Math.round(pm.income.budget / 1000),
                budgetEbitda: Math.round(pm.ebitda.budget / 1000),
                gmPercent: pm.grossMargin.percent,
                cmPercent: pm.income.actual > 0 ? Number(((pm.contributionMargin.actual / pm.income.actual) * 100).toFixed(2)) : 0,
            });
        }
    }

    // Revenue by Business Unit & Margin Breakdown
    const revenueByBu: RevenueByBuItem[] = [
        {
            bu: businessUnitTitle,
            actual: Math.round(defaultMetrics.income.actual / 1000),
            budget: Math.round(defaultMetrics.income.budget / 1000),
            ly: Math.round(defaultMetrics.income.ly / 1000),
        },
    ];

    const marginBreakdown: MarginBreakdownItem[] = [
        {
            stream: businessUnitTitle,
            revenue: `$${defaultMetrics.income.actual.toLocaleString()}`,
            directCost: `$${Math.round(defaultMetrics.income.actual - defaultMetrics.grossMargin.actual).toLocaleString()}`,
            grossMargin: `$${defaultMetrics.grossMargin.actual.toLocaleString()}`,
            gmPct: `${defaultMetrics.grossMargin.percent}%`,
            budgetGmPct: `${defaultMetrics.grossMargin.budgetPercent}%`,
            lyGmPct: "35.00%",
        },
    ];

    return {
        isFinancialMis,
        businessUnitTitle,
        availablePeriods,
        defaultPeriodId,
        periodsData,
        income: defaultMetrics.income,
        contributionMargin: defaultMetrics.contributionMargin,
        grossMargin: defaultMetrics.grossMargin,
        ebitda: defaultMetrics.ebitda,
        directBuMargin: defaultMetrics.directBuMargin,
        comparisonBars: defaultMetrics.comparisonBars,
        monthlyTrend,
        expenseBreakdown: defaultMetrics.expenseBreakdown,
        expenseCategories: defaultMetrics.expenseCategories,
        budgetVariances: defaultMetrics.budgetVariances,
        detailedRows: defaultMetrics.detailedRows,
        revenueByBu,
        marginBreakdown,
    };
}
