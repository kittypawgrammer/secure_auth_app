import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import * as XLSX from "xlsx";
import { analyzeWorkbook } from "@/lib/excel/analyzer";

export async function POST() {
    try {
        const user = await requireAuth();
        if (!user) {
            return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
        }

        // Generate a rich, realistic sample sales dataset with multiple sheets
        const salesData = [
            { Region: "North", Category: "Electronics", Product: "Laptop Pro", Units: 120, UnitPrice: 1200, Revenue: 144000, Cost: 95000, Profit: 49000, Status: "Completed", Month: "2026-01" },
            { Region: "South", Category: "Electronics", Product: "Wireless Earbuds", Units: 450, UnitPrice: 150, Revenue: 67500, Cost: 38000, Profit: 29500, Status: "Completed", Month: "2026-01" },
            { Region: "East", Category: "Office Furniture", Product: "Ergonomic Desk", Units: 85, UnitPrice: 650, Revenue: 55250, Cost: 36000, Profit: 19250, Status: "Pending", Month: "2026-02" },
            { Region: "West", Category: "Office Furniture", Product: "Executive Chair", Units: 160, UnitPrice: 380, Revenue: 60800, Cost: 41000, Profit: 19800, Status: "Completed", Month: "2026-02" },
            { Region: "North", Category: "Cloud Services", Product: "Enterprise Cloud", Units: 40, UnitPrice: 2500, Revenue: 100000, Cost: 42000, Profit: 58000, Status: "Completed", Month: "2026-03" },
            { Region: "West", Category: "Electronics", Product: "Smart Monitor 4K", Units: 210, UnitPrice: 450, Revenue: 94500, Cost: 62000, Profit: 32500, Status: "Completed", Month: "2026-03" },
            { Region: "East", Category: "Cloud Services", Product: "Security Suite", Units: 95, UnitPrice: 1100, Revenue: 104500, Cost: 51000, Profit: 53500, Status: "Completed", Month: "2026-04" },
            { Region: "South", Category: "Office Furniture", Product: "Filing Cabinet", Units: 130, UnitPrice: 220, Revenue: 28600, Cost: 18000, Profit: 10600, Status: "Cancelled", Month: "2026-04" },
            { Region: "North", Category: "Electronics", Product: "Mechanical Keyboard", Units: 340, UnitPrice: 110, Revenue: 37400, Cost: 21000, Profit: 16400, Status: "Completed", Month: "2026-05" },
            { Region: "West", Category: "Cloud Services", Product: "Backup Vault 10TB", Units: 75, UnitPrice: 850, Revenue: 63750, Cost: 29000, Profit: 34750, Status: "Completed", Month: "2026-05" },
            { Region: "East", Category: "Office Furniture", Product: "Conference Table", Units: 25, UnitPrice: 1800, Revenue: 45000, Cost: 29000, Profit: 16000, Status: "Completed", Month: "2026-06" },
            { Region: "South", Category: "Electronics", Product: "Noise-Cancelling Headphones", Units: 280, UnitPrice: 240, Revenue: 67200, Cost: 43000, Profit: 24200, Status: "Completed", Month: "2026-06" },
        ];

        const expensesData = [
            { Department: "Research & Development", ExpenseType: "Salaries", Amount: 240000, Quarter: "Q1", Status: "Approved" },
            { Department: "Sales & Marketing", ExpenseType: "Campaigns", Amount: 115000, Quarter: "Q1", Status: "Approved" },
            { Department: "Operations & Cloud", ExpenseType: "Infrastructure", Amount: 88000, Quarter: "Q1", Status: "Approved" },
            { Department: "General & Admin", ExpenseType: "Office Lease", Amount: 52000, Quarter: "Q1", Status: "Approved" },
            { Department: "Research & Development", ExpenseType: "Hardware Lab", Amount: 75000, Quarter: "Q2", Status: "Approved" },
            { Department: "Sales & Marketing", ExpenseType: "Sponsorships", Amount: 94000, Quarter: "Q2", Status: "Approved" },
            { Department: "Operations & Cloud", ExpenseType: "Bandwidth & CDN", Amount: 63000, Quarter: "Q2", Status: "Approved" },
            { Department: "General & Admin", ExpenseType: "Legal & Compliance", Amount: 38000, Quarter: "Q2", Status: "Approved" },
        ];

        // Create Excel Workbook with 2 sheets
        const wb = XLSX.utils.book_new();
        const ws1 = XLSX.utils.json_to_sheet(salesData);
        const ws2 = XLSX.utils.json_to_sheet(expensesData);

        XLSX.utils.book_append_sheet(wb, ws1, "Regional Sales");
        XLSX.utils.book_append_sheet(wb, ws2, "Operating Expenses");

        const excelBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

        // Analyze and extract
        const analysis = analyzeWorkbook(excelBuffer, "Sample_Corporate_MIS.xlsx");

        // Save into PostgreSQL
        const dataset = await prisma.uploadedDataset.create({
            data: {
                filename: "Sample_Corporate_MIS.xlsx",
                file_size: excelBuffer.length,
                uploaded_by_id: user.id,
                sheets: {
                    create: analysis.sheets.map((sheet, index) => ({
                        sheet_name: sheet.sheetName,
                        row_count: sheet.rowCount,
                        columns: sheet.columns as unknown as object,
                        rows: sheet.rows as unknown as object,
                        summary: sheet.summary as unknown as object,
                        sort_order: index,
                    })),
                },
            },
            include: {
                sheets: true,
            },
        });

        return NextResponse.json({
            message: "Sample dataset created successfully.",
            dataset,
        });
    } catch (error) {
        console.error("Create sample error:", error);
        return NextResponse.json({ message: "Failed to generate sample dataset." }, { status: 500 });
    }
}
