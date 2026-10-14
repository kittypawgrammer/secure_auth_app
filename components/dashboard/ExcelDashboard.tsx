"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
    LayoutDashboard,
    TrendingUp,
    Receipt,
    Percent,
    FileText,
    Coins,
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    Calendar,
    Upload,
    LogOut,
    CheckCircle2,
    AlertCircle,
    FileSpreadsheet,
    Menu,
    X,
    Lightbulb,
    Target,
    Layers,
    Trash2,
    Database,
} from "lucide-react";
import {
    ResponsiveContainer,
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from "recharts";

interface ExcelDashboardProps {
    user: {
        name: string;
        email: string;
        is_admin: boolean;
    };
}

interface FinancialMetrics {
    isFinancialMis?: boolean;
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
    comparisonBars: {
        name: string;
        actual2026: number;
        budget2026: number;
        actual2025: number;
    }[];
    monthlyTrend: {
        month: string;
        revenue: number;
        ebitda: number;
        budgetRevenue?: number;
        budgetEbitda?: number;
        gmPercent?: number;
        cmPercent?: number;
    }[];
    expenseBreakdown: {
        name: string;
        value: number;
        percent: number;
        color: string;
    }[];
    expenseCategories: {
        label: string;
        amount: number;
        percent: number;
    }[];
    budgetVariances: {
        name: string;
        amount: number;
        positive: boolean;
    }[];
    detailedRows: {
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
    }[];
    revenueByBu?: {
        bu: string;
        actual: number;
        budget: number;
        ly: number;
    }[];
    marginBreakdown?: {
        stream: string;
        revenue: string;
        directCost: string;
        grossMargin: string;
        gmPct: string;
        budgetGmPct: string;
        lyGmPct: string;
    }[];
    availablePeriods?: { id: string; label: string }[];
    defaultPeriodId?: string;
    periodsData?: Record<string, {
        income: { actual: number; budget: number; ly: number; varBudgetPct: number; varLyPct: number };
        contributionMargin: { actual: number; budget: number; ly: number; varBudgetPct: number; varLyPct: number };
        grossMargin: { actual: number; percent: number; budget: number; budgetPercent: number; varBudgetPp: number; varLyPp: number };
        ebitda: { actual: number; percent: number; budget: number; budgetPercent: number; varBudgetPct: number; varLyPct: number };
        directBuMargin: { actual: number; budget: number; varBudgetPct: number };
        comparisonBars: { name: string; actual2026: number; budget2026: number; actual2025: number }[];
        expenseBreakdown: { name: string; value: number; percent: number; color: string }[];
        expenseCategories: { label: string; amount: number; percent: number }[];
        budgetVariances: { name: string; amount: number; positive: boolean }[];
        detailedRows: { particulars: string; actual2026: string; budget2026: string; varBudget: string; varBudgetPct: string; actual2025: string; varLy: string; varLyPct: string; isBudgetPositive: boolean; isLyPositive: boolean }[];
    }>;
}

interface SheetData {
    id: string;
    sheet_name: string;
    row_count: number;
    columns: { key: string; name: string; type: string }[];
    rows: Record<string, unknown>[];
    summary: {
        totalRows: number;
        totalColumns: number;
        numericStats: Record<string, unknown>;
        categoryStats: Record<string, unknown>;
    };
    financialMetrics?: FinancialMetrics;
    sort_order: number;
}

interface Dataset {
    id: string;
    filename: string;
    file_size: number;
    created_at: string;
    sheets: SheetData[];
}

export function ExcelDashboard({ user }: ExcelDashboardProps) {
    const router = useRouter();

    // Active Sidebar Tab: "dashboard" | "revenue_margin"
    const [activeTab, setActiveTab] = useState<"dashboard" | "revenue_margin">("dashboard");

    // Datasets from PostgreSQL
    const [datasets, setDatasets] = useState<Dataset[]>([]);
    const [selectedDatasetId, setSelectedDatasetId] = useState<string | null>(null);
    const [selectedSheetIndex, setSelectedSheetIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    // Filters & UI state
    const [selectedPeriod, setSelectedPeriod] = useState("");
    const [selectedFrequency, setSelectedFrequency] = useState("Monthly");
    const [tableTab, setTableTab] = useState<"summary" | "expense" | "monthly">("summary");

    // Upload state
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState("");
    const [uploadSuccess, setUploadSuccess] = useState("");
    const [isMounted, setIsMounted] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setIsMounted(true);
    }, []);

    // Fetch datasets from backend
    const fetchDatasets = async () => {
        try {
            setLoading(true);
            const res = await fetch("/api/datasets");
            if (res.ok) {
                const data = await res.json();
                const list = data.datasets || [];
                setDatasets(list);
                if (list.length > 0 && !selectedDatasetId) {
                    setSelectedDatasetId(list[0].id);
                }
            }
        } catch (err) {
            console.error("Failed to fetch datasets:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDatasets();
    }, []);

    // Current active dataset & sheet
    const activeDataset = useMemo(() => {
        return datasets.find((d) => d.id === selectedDatasetId) || datasets[0] || null;
    }, [datasets, selectedDatasetId]);

    const activeSheet = useMemo(() => {
        if (!activeDataset || !activeDataset.sheets || activeDataset.sheets.length === 0) {
            return null;
        }
        return activeDataset.sheets[selectedSheetIndex] || activeDataset.sheets[0];
    }, [activeDataset, selectedSheetIndex]);

    // Raw financial metrics from sheet
    const rawFm: FinancialMetrics | null = useMemo(() => {
        if (!activeSheet) return null;
        return (
            (activeSheet.financialMetrics as FinancialMetrics) ||
            ((activeSheet.summary as Record<string, unknown>)?.financialMetrics as FinancialMetrics) ||
            null
        );
    }, [activeSheet]);

    // Update selected period when rawFm changes
    useEffect(() => {
        if (rawFm?.availablePeriods && rawFm.availablePeriods.length > 0) {
            setSelectedPeriod((prev) => {
                const exists = rawFm.availablePeriods?.some((p) => p.id === prev);
                return exists ? prev : (rawFm.defaultPeriodId || rawFm.availablePeriods?.[0]?.id || "");
            });
        }
    }, [rawFm]);

    // Dynamic financial metrics for currently selected period
    const fm: FinancialMetrics | null = useMemo(() => {
        if (!rawFm) return null;
        if (selectedPeriod && rawFm.periodsData && rawFm.periodsData[selectedPeriod]) {
            const pData = rawFm.periodsData[selectedPeriod];
            return {
                ...rawFm,
                income: pData.income,
                contributionMargin: pData.contributionMargin,
                grossMargin: pData.grossMargin,
                ebitda: pData.ebitda,
                directBuMargin: pData.directBuMargin,
                comparisonBars: pData.comparisonBars,
                expenseBreakdown: pData.expenseBreakdown,
                expenseCategories: pData.expenseCategories,
                budgetVariances: pData.budgetVariances,
                detailedRows: pData.detailedRows,
                monthlyTrend: rawFm.monthlyTrend || [],
                revenueByBu: rawFm.revenueByBu || [],
                marginBreakdown: rawFm.marginBreakdown || [],
            };
        }
        return rawFm;
    }, [rawFm, selectedPeriod]);

    // Logout Handler
    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
    };

    // Upload file handler
    const handleFileUpload = async (file: File) => {
        setUploading(true);
        setUploadError("");
        setUploadSuccess("");

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch("/api/datasets/upload", {
                method: "POST",
                body: formData,
            });

            const data = await res.json();
            if (!res.ok) {
                setUploadError(data.message || "Failed to upload file.");
                return;
            }

            setUploadSuccess("Excel uploaded and processed successfully!");
            await fetchDatasets();
            setSelectedDatasetId(data.dataset.id);
            setSelectedSheetIndex(0);
            setTimeout(() => {
                setIsUploadModalOpen(false);
                setUploadSuccess("");
            }, 1000);
        } catch {
            setUploadError("Network error occurred during file upload.");
        } finally {
            setUploading(false);
        }
    };

    // Delete Dataset
    const handleDeleteDataset = async (id: string) => {
        if (!confirm("Are you sure you want to delete this dataset?")) return;
        try {
            const res = await fetch(`/api/datasets/${id}`, { method: "DELETE" });
            if (res.ok) {
                const remaining = datasets.filter((d) => d.id !== id);
                setDatasets(remaining);
                setSelectedDatasetId(remaining.length > 0 ? remaining[0].id : null);
                setSelectedSheetIndex(0);
            }
        } catch (err) {
            console.error("Delete failed:", err);
        }
    };

    return (
        <div className="flex min-h-screen bg-[#F8FAFC] text-slate-800 font-sans">
            {/* ------------------------------------------------------------- */}
            {/* LEFT SIDEBAR (Dark Navy / Black)                              */}
            {/* ------------------------------------------------------------- */}
            <aside
                className={`fixed inset-y-0 left-0 z-40 w-64 flex flex-col justify-between bg-[#0B132B] text-slate-300 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
                    isMobileSidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
                }`}
            >
                <div>
                    {/* Brand */}
                    <div className="flex h-16 items-center justify-between px-6 border-b border-slate-800/80">
                        <div className="flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md shadow-blue-500/30">
                                <Coins className="h-4 w-4" />
                            </div>
                            <span className="text-base font-bold tracking-tight text-white">
                                Financial MIS
                            </span>
                        </div>
                        <button
                            onClick={() => setIsMobileSidebarOpen(false)}
                            className="lg:hidden rounded-lg p-1 text-slate-400 hover:text-white"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Navigation Items */}
                    <nav className="mt-5 space-y-1 px-3">
                        <button
                            onClick={() => {
                                setActiveTab("dashboard");
                                setIsMobileSidebarOpen(false);
                            }}
                            className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                                activeTab === "dashboard"
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-bold"
                                    : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                            }`}
                        >
                            <LayoutDashboard className="h-4 w-4 shrink-0" />
                            <span>Dashboard</span>
                        </button>

                        <button
                            onClick={() => {
                                setActiveTab("revenue_margin");
                                setIsMobileSidebarOpen(false);
                            }}
                            className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all ${
                                activeTab === "revenue_margin"
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 font-bold"
                                    : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                            }`}
                        >
                            <TrendingUp className="h-4 w-4 shrink-0" />
                            <span>Revenue &amp; Margin</span>
                        </button>

                        <button
                            disabled
                            className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-500 opacity-60 cursor-not-allowed"
                        >
                            <div className="flex items-center gap-3">
                                <Receipt className="h-4 w-4 shrink-0" />
                                <span>Expenses</span>
                            </div>
                            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">Soon</span>
                        </button>

                        <button
                            disabled
                            className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-500 opacity-60 cursor-not-allowed"
                        >
                            <div className="flex items-center gap-3">
                                <Percent className="h-4 w-4 shrink-0" />
                                <span>EBITDA</span>
                            </div>
                            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">Soon</span>
                        </button>

                        <button
                            disabled
                            className="flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-500 opacity-60 cursor-not-allowed"
                        >
                            <div className="flex items-center gap-3">
                                <FileText className="h-4 w-4 shrink-0" />
                                <span>Reports</span>
                            </div>
                            <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">Soon</span>
                        </button>

                        {/* Admin Section */}
                        <div className="pt-6 pb-2 px-3 text-[11px] font-bold tracking-wider text-slate-500 uppercase">
                            Admin
                        </div>

                        <button
                            onClick={() => setIsUploadModalOpen(true)}
                            className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800/60 hover:text-white transition-colors"
                        >
                            <Upload className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                            <span>Upload Excel File</span>
                        </button>
                    </nav>
                </div>

                {/* Bottom Signout */}
                <div className="p-3 border-t border-slate-800/80">
                    <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
                    >
                        <LogOut className="h-4 w-4 shrink-0" />
                        <span>Sign out</span>
                    </button>
                </div>
            </aside>

            {/* Mobile Backdrop */}
            {isMobileSidebarOpen && (
                <div
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm lg:hidden"
                />
            )}

            {/* ------------------------------------------------------------- */}
            {/* MAIN DASHBOARD CONTENT AREA                                   */}
            {/* ------------------------------------------------------------- */}
            <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
                {/* Top Header Filter Bar */}
                <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 bg-white/95 px-6 py-3.5 backdrop-blur-md">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsMobileSidebarOpen(true)}
                            className="lg:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100"
                        >
                            <Menu className="h-5 w-5" />
                        </button>
                        <div>
                            <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
                                {activeTab === "dashboard"
                                    ? "Financial MIS Dashboard"
                                    : "Revenue & Margin Performance"}
                            </h2>
                            <p className="text-xs text-slate-500">
                                {activeDataset
                                    ? `Data Source: ${activeDataset.filename} (${activeSheet?.sheet_name || ""})`
                                    : "Track performance vs. Budget and Last Year"}
                            </p>
                        </div>
                    </div>

                    {/* Filters & Actions */}
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Period Filter */}
                        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
                            <Calendar className="h-3.5 w-3.5 text-slate-500" />
                            <select
                                value={selectedPeriod}
                                onChange={(e) => setSelectedPeriod(e.target.value)}
                                className="bg-transparent font-semibold outline-none cursor-pointer"
                            >
                                {rawFm?.availablePeriods && rawFm.availablePeriods.length > 0 ? (
                                    rawFm.availablePeriods.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.label}
                                        </option>
                                    ))
                                ) : (
                                    <option value="">No Periods</option>
                                )}
                            </select>
                        </div>

                        {/* Frequency Filter */}
                        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
                            <select
                                value={selectedFrequency}
                                onChange={(e) => setSelectedFrequency(e.target.value)}
                                className="bg-transparent font-semibold outline-none cursor-pointer"
                            >
                                <option value="Monthly">Monthly</option>
                                <option value="Quarterly">Quarterly</option>
                                <option value="YTD">YTD</option>
                            </select>
                        </div>

                        {/* Business Unit / Sheet Filter */}
                        <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
                            <select
                                value={selectedSheetIndex}
                                onChange={(e) => setSelectedSheetIndex(Number(e.target.value))}
                                className="bg-transparent font-semibold outline-none cursor-pointer"
                            >
                                {activeDataset?.sheets && activeDataset.sheets.length > 0 ? (
                                    activeDataset.sheets.map((s, idx) => (
                                        <option key={s.id || idx} value={idx}>
                                            {s.sheet_name}
                                        </option>
                                    ))
                                ) : (
                                    <option value={0}>Main Sheet</option>
                                )}
                            </select>
                        </div>

                        {/* Upload Sheet Button */}
                        <button
                            onClick={() => setIsUploadModalOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition-all active:scale-95"
                        >
                            <Upload className="h-3.5 w-3.5" />
                            <span>Upload Sheet</span>
                        </button>

                        {/* User Profile Avatar */}
                        <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-700 text-xs font-bold text-white shadow">
                                PK
                            </div>
                            <div className="hidden xl:block text-left">
                                <p className="text-xs font-bold text-slate-900 leading-tight">
                                    {user.name || "Priyanka"}
                                </p>
                                <p className="text-[11px] text-slate-400">Inventory Manager</p>
                            </div>
                        </div>
                    </div>
                </header>

                {/* Main Body */}
                <main className="p-6 space-y-6 max-w-7xl mx-auto w-full">
                    {/* NO DATASET UPLOADED: Prompt to Upload Excel File */}
                    {!loading && datasets.length === 0 && (
                        <div className="flex min-h-[60vh] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
                            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 mb-4">
                                <Upload className="h-8 w-8" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900">Upload your Financial Excel File</h2>
                            <p className="mt-2 max-w-md text-sm text-slate-500">
                                Please upload your <strong>.xlsx</strong>, <strong>.xls</strong>, or <strong>.csv</strong> spreadsheet. The dashboard will automatically read all rows, calculate margins, and render your charts directly from your Excel data.
                            </p>
                            <button
                                onClick={() => setIsUploadModalOpen(true)}
                                className="mt-6 inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700 transition-all active:scale-95"
                            >
                                <Upload className="h-4 w-4" />
                                Select Excel File to Upload
                            </button>
                        </div>
                    )}

                    {/* DATASET CONTROLS & SHEET TABS (When files exist) */}
                    {activeDataset && (
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                                    <Database className="h-4 w-4" />
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-slate-500">File:</span>
                                    <select
                                        value={selectedDatasetId || ""}
                                        onChange={(e) => {
                                            setSelectedDatasetId(e.target.value);
                                            setSelectedSheetIndex(0);
                                        }}
                                        className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                                    >
                                        {datasets.map((d) => (
                                            <option key={d.id} value={d.id}>
                                                {d.filename}
                                            </option>
                                        ))}
                                    </select>
                                    <span className="text-xs text-slate-400">
                                        ({activeSheet?.row_count || 0} rows)
                                    </span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                {activeDataset.sheets && activeDataset.sheets.length > 1 && (
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs text-slate-400 flex items-center gap-1">
                                            <Layers className="h-3 w-3" /> Tab:
                                        </span>
                                        {activeDataset.sheets.map((sheet, index) => (
                                            <button
                                                key={sheet.id || index}
                                                onClick={() => setSelectedSheetIndex(index)}
                                                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                                                    selectedSheetIndex === index
                                                        ? "bg-blue-600 text-white shadow-sm"
                                                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                                }`}
                                            >
                                                {sheet.sheet_name}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <button
                                    onClick={() => handleDeleteDataset(activeDataset.id)}
                                    title="Delete this uploaded dataset"
                                    className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ========================================================= */}
                    {/* VIEW 1: MAIN FINANCIAL DASHBOARD                           */}
                    {/* ========================================================= */}
                    {activeTab === "dashboard" && activeDataset && fm && (
                        <>
                            {/* 4 Top KPI Cards (from real Excel metrics) */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                {/* Total Income */}
                                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100/70 text-emerald-600 shadow-sm">
                                            <Coins className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                                Total Income
                                            </p>
                                            <p className="text-2xl font-black text-slate-900 mt-0.5">
                                                ${fm.income.actual.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-bold">
                                        <span className={`flex items-center ${fm.income.varBudgetPct >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                            {fm.income.varBudgetPct >= 0 ? <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" /> : <ArrowDownRight className="h-3.5 w-3.5 mr-0.5" />}
                                            {Math.abs(fm.income.varBudgetPct)}% vs Budget
                                        </span>
                                        <span className={`flex items-center ${fm.income.varLyPct >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                            {fm.income.varLyPct >= 0 ? <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" /> : <ArrowDownRight className="h-3.5 w-3.5 mr-0.5" />}
                                            {Math.abs(fm.income.varLyPct)}% vs LY
                                        </span>
                                    </div>
                                </div>

                                {/* Contribution Margin */}
                                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100/70 text-blue-600 shadow-sm">
                                            <Wallet className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                                Contribution Margin
                                            </p>
                                            <p className="text-2xl font-black text-slate-900 mt-0.5">
                                                ${fm.contributionMargin.actual.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-bold">
                                        <span className={`flex items-center ${fm.contributionMargin.varBudgetPct >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                            {fm.contributionMargin.varBudgetPct >= 0 ? <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" /> : <ArrowDownRight className="h-3.5 w-3.5 mr-0.5" />}
                                            {Math.abs(fm.contributionMargin.varBudgetPct)}% vs Budget
                                        </span>
                                        <span className={`flex items-center ${fm.contributionMargin.varLyPct >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                            {fm.contributionMargin.varLyPct >= 0 ? <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" /> : <ArrowDownRight className="h-3.5 w-3.5 mr-0.5" />}
                                            {Math.abs(fm.contributionMargin.varLyPct)}% vs LY
                                        </span>
                                    </div>
                                </div>

                                {/* Gross Margin % */}
                                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-purple-100/70 text-purple-600 shadow-sm">
                                            <Percent className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                                Gross Margin %
                                            </p>
                                            <p className="text-2xl font-black text-slate-900 mt-0.5">
                                                {fm.grossMargin.percent}%
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-bold">
                                        <span className={`flex items-center ${fm.grossMargin.varBudgetPp >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                            {fm.grossMargin.varBudgetPp >= 0 ? <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" /> : <ArrowDownRight className="h-3.5 w-3.5 mr-0.5" />}
                                            {Math.abs(fm.grossMargin.varBudgetPp)} pp vs Budget
                                        </span>
                                        <span className={`flex items-center ${fm.grossMargin.varLyPp >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                            {fm.grossMargin.varLyPp >= 0 ? <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" /> : <ArrowDownRight className="h-3.5 w-3.5 mr-0.5" />}
                                            {Math.abs(fm.grossMargin.varLyPp)} pp vs LY
                                        </span>
                                    </div>
                                </div>

                                {/* EBITDA */}
                                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100/70 text-amber-600 shadow-sm">
                                            <TrendingUp className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                                                EBITDA
                                            </p>
                                            <p className="text-2xl font-black text-slate-900 mt-0.5">
                                                ${fm.ebitda.actual.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-bold">
                                        <span className={`flex items-center ${fm.ebitda.varBudgetPct >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                            {fm.ebitda.varBudgetPct >= 0 ? <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" /> : <ArrowDownRight className="h-3.5 w-3.5 mr-0.5" />}
                                            {Math.abs(fm.ebitda.varBudgetPct)}% vs Budget
                                        </span>
                                        <span className={`flex items-center ${fm.ebitda.varLyPct >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                                            {fm.ebitda.varLyPct >= 0 ? <ArrowUpRight className="h-3.5 w-3.5 mr-0.5" /> : <ArrowDownRight className="h-3.5 w-3.5 mr-0.5" />}
                                            {Math.abs(fm.ebitda.varLyPct)}% vs LY
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Charts Row 1: Comparison Bar Chart + Monthly Trend Line Chart */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                {/* Grouped Comparison Bar Chart (7 cols) */}
                                <div className="lg:col-span-7 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900">
                                                Revenue, Contribution &amp; EBITDA Comparison
                                            </h3>
                                            <p className="text-xs text-slate-400">Values in Thousands ($k)</p>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs font-semibold">
                                            <span className="flex items-center gap-1.5 text-slate-700">
                                                <span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> Actual 2026
                                            </span>
                                            <span className="flex items-center gap-1.5 text-slate-700">
                                                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" /> Budget 2026
                                            </span>
                                            <span className="flex items-center gap-1.5 text-slate-700">
                                                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" /> Actual 2025
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-5 h-[280px] w-full">
                                        {isMounted && (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={fm.comparisonBars} margin={{ top: 15, right: 10, left: -15, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748B" }} />
                                                    <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickFormatter={(v) => `$${v}k`} />
                                                    <Tooltip
                                                        contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: "12px", fontWeight: 600 }}
                                                        formatter={(val: unknown) => [`$${Number(val).toLocaleString()}k`, ""]}
                                                    />
                                                    <Bar dataKey="actual2026" name="Actual 2026" fill="#2563EB" radius={[4, 4, 0, 0]} />
                                                    <Bar dataKey="budget2026" name="Budget 2026" fill="#10B981" radius={[4, 4, 0, 0]} />
                                                    <Bar dataKey="actual2025" name="Actual 2025" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>
                                </div>

                                {/* Monthly Trend (Revenue & EBITDA) (5 cols) */}
                                <div className="lg:col-span-5 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900">
                                                Monthly Trend (Revenue &amp; EBITDA)
                                            </h3>
                                            <p className="text-xs text-slate-400">12-Month Performance</p>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs font-semibold">
                                            <span className="flex items-center gap-1.5 text-slate-700">
                                                <span className="h-2 w-2 rounded-full bg-blue-600" /> Revenue
                                            </span>
                                            <span className="flex items-center gap-1.5 text-slate-700">
                                                <span className="h-2 w-2 rounded-full bg-emerald-500" /> EBITDA
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-5 h-[280px] w-full">
                                        {isMounted && (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={fm.monthlyTrend} margin={{ top: 15, right: 10, left: -15, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} />
                                                    <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickFormatter={(v) => `$${v}k`} />
                                                    <Tooltip
                                                        contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: "12px", fontWeight: 600 }}
                                                        formatter={(val: unknown) => [`$${Number(val).toLocaleString()}k`, ""]}
                                                    />
                                                    <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 3 }} />
                                                    <Line type="monotone" dataKey="ebitda" name="EBITDA" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Charts Row 2: Expense Breakdown + Expense by Category + Budget Variance */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* Expense Breakdown (Donut Chart) */}
                                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                                    <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                                        Expense Breakdown
                                    </h3>
                                    <div className="mt-3 relative h-[210px] w-full flex items-center justify-center">
                                        {isMounted && (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={fm.expenseBreakdown}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={55}
                                                        outerRadius={80}
                                                        paddingAngle={3}
                                                        dataKey="value"
                                                    >
                                                        {fm.expenseBreakdown.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip formatter={(val: unknown) => [`$${Number(val).toLocaleString()}`, ""]} />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        )}
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-[11px] font-semibold text-slate-400">Total Expenses</span>
                                            <span className="text-base font-black text-slate-900">
                                                ${fm.expenseBreakdown.reduce((a, b) => a + b.value, 0).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-3 text-xs">
                                        {fm.expenseBreakdown.map((item) => (
                                            <div key={item.name} className="flex items-center justify-between font-medium">
                                                <span className="flex items-center gap-2 text-slate-600">
                                                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                                                    {item.name}
                                                </span>
                                                <span className="font-bold text-slate-800">
                                                    ${item.value.toLocaleString()} ({item.percent}%)
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Expense by Category (Horizontal Ranked Bars) */}
                                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                                    <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
                                        Expense by Category
                                    </h3>
                                    <div className="mt-4 space-y-2.5">
                                        {fm.expenseCategories.map((item) => (
                                            <div key={item.label} className="space-y-1">
                                                <div className="flex items-center justify-between text-xs font-semibold">
                                                    <span className="text-slate-700 truncate pr-2">{item.label}</span>
                                                    <span className="text-slate-900 shrink-0 font-mono">
                                                        ${item.amount.toLocaleString()} <span className="text-slate-400 font-normal">({item.percent}%)</span>
                                                    </span>
                                                </div>
                                                <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full bg-blue-600 transition-all duration-500"
                                                        style={{ width: `${Math.max(item.percent * 6, item.amount > 0 ? 5 : 0)}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Budget Variance (Amount) */}
                                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                        <h3 className="text-sm font-bold text-slate-900">
                                            Budget Variance (Amount)
                                        </h3>
                                        <div className="flex items-center gap-2 text-[10px] font-bold">
                                            <span className="flex items-center gap-1 text-emerald-600">
                                                <span className="h-2 w-2 rounded-sm bg-emerald-500" /> Favorable
                                            </span>
                                            <span className="flex items-center gap-1 text-rose-600">
                                                <span className="h-2 w-2 rounded-sm bg-rose-500" /> Unfavorable
                                            </span>
                                        </div>
                                    </div>

                                    <div className="mt-4 space-y-2.5">
                                        {fm.budgetVariances.map((item) => (
                                            <div key={item.name} className="flex items-center justify-between text-xs">
                                                <span className="text-slate-700 font-medium truncate pr-2 w-36">
                                                    {item.name}
                                                </span>
                                                <div className="flex-1 flex items-center justify-end gap-2">
                                                    <div className="w-24 h-2.5 bg-slate-100 rounded-full overflow-hidden flex justify-end">
                                                        <div
                                                            className={`h-full rounded-full ${
                                                                item.positive ? "bg-emerald-500" : "bg-rose-500"
                                                            }`}
                                                            style={{ width: `${Math.min(Math.abs(item.amount) / 1000, 100)}%` }}
                                                        />
                                                    </div>
                                                    <span
                                                        className={`font-bold font-mono text-xs w-16 text-right ${
                                                            item.positive ? "text-emerald-600" : "text-rose-600"
                                                        }`}
                                                    >
                                                        {item.positive ? `+$${item.amount.toLocaleString()}` : `-$${Math.abs(item.amount).toLocaleString()}`}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Row 3: Detailed Financials Table & Key Insights Box */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                {/* Detailed Financials Table (8 cols) */}
                                <div className="lg:col-span-8 rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
                                    <div className="flex flex-wrap items-center justify-between border-b border-slate-100 px-6 py-3.5">
                                        <h3 className="text-sm font-bold text-slate-900">Detailed Financials</h3>
                                        <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
                                            <button
                                                onClick={() => setTableTab("summary")}
                                                className={`rounded-md px-2.5 py-1 transition-all ${
                                                    tableTab === "summary"
                                                        ? "bg-white text-blue-600 shadow-sm"
                                                        : "text-slate-600 hover:text-slate-900"
                                                }`}
                                            >
                                                Financial Summary
                                            </button>
                                            <button
                                                onClick={() => setTableTab("expense")}
                                                className={`rounded-md px-2.5 py-1 transition-all ${
                                                    tableTab === "expense"
                                                        ? "bg-white text-blue-600 shadow-sm"
                                                        : "text-slate-600 hover:text-slate-900"
                                                }`}
                                            >
                                                Expense Details
                                            </button>
                                            <button
                                                onClick={() => setTableTab("monthly")}
                                                className={`rounded-md px-2.5 py-1 transition-all ${
                                                    tableTab === "monthly"
                                                        ? "bg-white text-blue-600 shadow-sm"
                                                        : "text-slate-600 hover:text-slate-900"
                                                }`}
                                            >
                                                Monthly Data
                                            </button>
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                                                <tr>
                                                    <th className="py-3 px-4">Particulars</th>
                                                    <th className="py-3 px-4">Actual 2026</th>
                                                    <th className="py-3 px-4">Budget 2026</th>
                                                    <th className="py-3 px-4">Var (vs Budget)</th>
                                                    <th className="py-3 px-4">Var %</th>
                                                    <th className="py-3 px-4">Actual 2025</th>
                                                    <th className="py-3 px-4">Var (vs LY)</th>
                                                    <th className="py-3 px-4">Var %</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 font-medium">
                                                {fm.detailedRows.map((row, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                                                        <td className="py-3 px-4 font-bold text-slate-900">{row.particulars}</td>
                                                        <td className="py-3 px-4 font-semibold text-slate-800">{row.actual2026}</td>
                                                        <td className="py-3 px-4 text-slate-600">{row.budget2026}</td>
                                                        <td className={`py-3 px-4 font-bold font-mono ${row.isBudgetPositive ? "text-emerald-600" : "text-rose-600"}`}>
                                                            {row.varBudget}
                                                        </td>
                                                        <td className={`py-3 px-4 font-bold font-mono ${row.isBudgetPositive ? "text-emerald-600" : "text-rose-600"}`}>
                                                            {row.varBudgetPct}
                                                        </td>
                                                        <td className="py-3 px-4 text-slate-600">{row.actual2025}</td>
                                                        <td className={`py-3 px-4 font-bold font-mono ${row.isLyPositive ? "text-emerald-600" : "text-rose-600"}`}>
                                                            {row.varLy}
                                                        </td>
                                                        <td className={`py-3 px-4 font-bold font-mono ${row.isLyPositive ? "text-emerald-600" : "text-rose-600"}`}>
                                                            {row.varLyPct}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Key Insights & Focus Areas Box (4 cols) */}
                                <div className="lg:col-span-4 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm flex flex-col justify-between space-y-6">
                                    <div>
                                        <div className="flex items-center gap-2 text-amber-600 font-bold text-sm border-b border-slate-100 pb-3">
                                            <Lightbulb className="h-4 w-4" />
                                            <span>Key Insights</span>
                                        </div>
                                        <ul className="mt-4 space-y-2.5 text-xs text-slate-600 list-disc list-inside leading-relaxed">
                                            <li>
                                                Revenue is <strong className="text-rose-600">{Math.abs(fm.income.varBudgetPct)}% below budget</strong> but <strong className="text-emerald-600">{fm.income.varLyPct}% higher</strong> than last year.
                                            </li>
                                            <li>
                                                Contribution margin is lower due to higher employee delivery costs.
                                            </li>
                                            <li>
                                                EBITDA is <strong className="text-emerald-600">{fm.ebitda.varBudgetPct}% above budget</strong> despite lower gross margin.
                                            </li>
                                            <li>
                                                Employee Cost variance stands at ${Math.abs(fm.budgetVariances.find((b) => b.name === "Employee Cost")?.amount || 90283).toLocaleString()}.
                                            </li>
                                        </ul>
                                    </div>

                                    {/* Focus Areas Card */}
                                    <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4">
                                        <div className="flex items-center gap-2 text-blue-700 font-bold text-xs mb-1.5">
                                            <Target className="h-4 w-4" />
                                            <span>Focus Areas</span>
                                        </div>
                                        <p className="text-xs text-blue-900 leading-relaxed font-medium">
                                            Control employee costs and improve gross margin in Consulting &amp; Delivery to achieve overall quarterly targets.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {/* ========================================================= */}
                    {/* VIEW 2: REVENUE & MARGIN DEDICATED VIEW                  */}
                    {/* ========================================================= */}
                    {activeTab === "revenue_margin" && activeDataset && fm && (
                        <div className="space-y-6">
                            {/* Revenue & Margin Top KPI Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Gross Revenue</p>
                                    <p className="text-2xl font-black text-slate-900 mt-1">${fm.income.actual.toLocaleString()}</p>
                                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold">
                                        <span className="text-rose-600">▼ {Math.abs(fm.income.varBudgetPct)}% vs Budget</span>
                                        <span className="text-emerald-600">▲ {fm.income.varLyPct}% vs LY</span>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Gross Margin Amount</p>
                                    <p className="text-2xl font-black text-slate-900 mt-1">${fm.grossMargin.actual.toLocaleString()}</p>
                                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold">
                                        <span className="text-slate-500">GM %: <strong>{fm.grossMargin.percent}%</strong></span>
                                        <span className="text-rose-600">▼ {Math.abs(fm.grossMargin.varBudgetPp)} pp</span>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Contribution Margin</p>
                                    <p className="text-2xl font-black text-slate-900 mt-1">${fm.contributionMargin.actual.toLocaleString()}</p>
                                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold">
                                        <span className="text-slate-500">CM %: <strong>{(((fm.contributionMargin.actual / fm.income.actual) * 100) || 34.91).toFixed(2)}%</strong></span>
                                        <span className="text-rose-600">▼ {Math.abs(fm.contributionMargin.varBudgetPct)}%</span>
                                    </div>
                                </div>

                                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Direct BU Margin</p>
                                    <p className="text-2xl font-black text-slate-900 mt-1">${fm.directBuMargin.actual.toLocaleString()}</p>
                                    <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold">
                                        <span className="text-slate-500">BU Margin: <strong>{(((fm.directBuMargin.actual / fm.income.actual) * 100) || 25.96).toFixed(2)}%</strong></span>
                                        <span className="text-emerald-600">▲ +{fm.directBuMargin.varBudgetPct}%</span>
                                    </div>
                                </div>
                            </div>

                            {/* Revenue by Business Unit & Margin Trend Progression */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                                {/* Revenue by Business Unit Bar Chart (6 cols) */}
                                <div className="lg:col-span-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900">Revenue by Business Unit</h3>
                                            <p className="text-xs text-slate-400">Actual vs Budget vs LY ($k)</p>
                                        </div>
                                    </div>
                                    <div className="mt-5 h-[280px] w-full">
                                        {isMounted && fm.revenueByBu && (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={fm.revenueByBu} margin={{ top: 15, right: 10, left: -15, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                                    <XAxis dataKey="bu" tick={{ fontSize: 10, fill: "#64748B" }} />
                                                    <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickFormatter={(v) => `$${v}k`} />
                                                    <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: "12px" }} formatter={(val: unknown) => [`$${Number(val).toLocaleString()}k`, ""]} />
                                                    <Bar dataKey="actual" name="Actual 2026" fill="#2563EB" radius={[4, 4, 0, 0]} />
                                                    <Bar dataKey="budget" name="Budget 2026" fill="#10B981" radius={[4, 4, 0, 0]} />
                                                    <Bar dataKey="ly" name="Actual 2025" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>
                                </div>

                                {/* Monthly Margin % Trend (6 cols) */}
                                <div className="lg:col-span-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900">Monthly Margin % Progression</h3>
                                            <p className="text-xs text-slate-400">Gross Margin % vs Contribution Margin %</p>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs font-semibold">
                                            <span className="flex items-center gap-1.5 text-slate-700">
                                                <span className="h-2 w-2 rounded-full bg-purple-600" /> Gross Margin %
                                            </span>
                                            <span className="flex items-center gap-1.5 text-slate-700">
                                                <span className="h-2 w-2 rounded-full bg-blue-600" /> Contribution %
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-5 h-[280px] w-full">
                                        {isMounted && (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <LineChart data={fm.monthlyTrend} margin={{ top: 15, right: 10, left: -15, bottom: 5 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                                                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} />
                                                    <YAxis tick={{ fontSize: 11, fill: "#64748B" }} tickFormatter={(v) => `${v}%`} domain={[25, 45]} />
                                                    <Tooltip contentStyle={{ borderRadius: "12px", border: "1px solid #E2E8F0", fontSize: "12px" }} formatter={(val: unknown) => [`${Number(val).toFixed(2)}%`, ""]} />
                                                    <Line type="monotone" dataKey="gmPercent" name="Gross Margin %" stroke="#8B5CF6" strokeWidth={2.5} dot={{ r: 3 }} />
                                                    <Line type="monotone" dataKey="cmPercent" name="Contribution Margin %" stroke="#2563EB" strokeWidth={2.5} dot={{ r: 3 }} />
                                                </LineChart>
                                            </ResponsiveContainer>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Detailed Revenue & Margin Breakdown Table */}
                            {fm.marginBreakdown && (
                                <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
                                    <div className="border-b border-slate-100 px-6 py-4">
                                        <h3 className="text-sm font-bold text-slate-900">
                                            Stream-Wise Revenue &amp; Margin Contribution
                                        </h3>
                                        <p className="text-xs text-slate-500">Breakdown of Direct Costs and Gross Margins per Business Unit</p>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-xs">
                                            <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                                                <tr>
                                                    <th className="py-3 px-4">Business Stream</th>
                                                    <th className="py-3 px-4">Revenue</th>
                                                    <th className="py-3 px-4">Direct Costs</th>
                                                    <th className="py-3 px-4">Gross Margin</th>
                                                    <th className="py-3 px-4">GM %</th>
                                                    <th className="py-3 px-4">Budget GM %</th>
                                                    <th className="py-3 px-4">LY GM %</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 font-medium">
                                                {fm.marginBreakdown.map((row, idx) => (
                                                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                                                        <td className="py-3.5 px-4 font-bold text-slate-900">{row.stream}</td>
                                                        <td className="py-3.5 px-4 font-semibold text-slate-800">{row.revenue}</td>
                                                        <td className="py-3.5 px-4 text-slate-600">{row.directCost}</td>
                                                        <td className="py-3.5 px-4 font-bold text-emerald-600">{row.grossMargin}</td>
                                                        <td className="py-3.5 px-4 font-bold text-purple-700 font-mono">{row.gmPct}</td>
                                                        <td className="py-3.5 px-4 text-slate-500">{row.budgetGmPct}</td>
                                                        <td className="py-3.5 px-4 text-slate-500">{row.lyGmPct}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </main>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* UPLOAD EXCEL MODAL                                            */}
            {/* ------------------------------------------------------------- */}
            {isUploadModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                    <Upload className="h-5 w-5" />
                                </div>
                                <h3 className="text-base font-bold text-slate-900">Upload Financial Excel Sheet</h3>
                            </div>
                            <button
                                onClick={() => setIsUploadModalOpen(false)}
                                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="mt-5">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={(e) => e.preventDefault()}
                                onDrop={(e) => {
                                    e.preventDefault();
                                    const file = e.dataTransfer.files[0];
                                    if (file) handleFileUpload(file);
                                }}
                                className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
                                    uploading
                                        ? "border-blue-300 bg-blue-50/50"
                                        : "border-slate-300 bg-slate-50 hover:border-blue-500 hover:bg-blue-50/30"
                                }`}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".xlsx, .xls, .csv"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) handleFileUpload(file);
                                    }}
                                />

                                <FileSpreadsheet className="h-10 w-10 text-blue-600 mb-3" />
                                <p className="text-sm font-bold text-slate-800">
                                    {uploading ? "Uploading & Analyzing..." : "Click or drag & drop your Excel sheet here"}
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    Supports .xlsx, .xls, and .csv (up to 15MB)
                                </p>
                            </div>

                            {uploadError && (
                                <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs font-semibold text-red-700 border border-red-100">
                                    <AlertCircle className="h-4 w-4 shrink-0" />
                                    <span>{uploadError}</span>
                                </div>
                            )}

                            {uploadSuccess && (
                                <div className="mt-4 flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-700 border border-emerald-100">
                                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                                    <span>{uploadSuccess}</span>
                                </div>
                            )}

                            <div className="mt-6 flex items-center justify-end border-t border-slate-100 pt-4">
                                <button
                                    onClick={() => setIsUploadModalOpen(false)}
                                    className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
