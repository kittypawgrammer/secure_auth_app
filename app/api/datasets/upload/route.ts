import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { analyzeWorkbook } from "@/lib/excel/analyzer";

export async function POST(request: Request) {
    try {
        const user = await requireAuth();
        if (!user) {
            return NextResponse.json({ message: "Unauthorized. Please log in." }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get("file") as File | null;

        if (!file) {
            return NextResponse.json({ message: "No file provided." }, { status: 400 });
        }

        const filename = file.name;
        const validExtensions = [".xlsx", ".xls", ".csv"];
        const hasValidExt = validExtensions.some((ext) => filename.toLowerCase().endsWith(ext));

        if (!hasValidExt) {
            return NextResponse.json(
                { message: "Invalid file type. Please upload an Excel (.xlsx, .xls) or CSV file." },
                { status: 400 }
            );
        }

        // Limit file size to 15MB
        if (file.size > 15 * 1024 * 1024) {
            return NextResponse.json(
                { message: "File exceeds 15MB limit. Please upload a smaller file." },
                { status: 400 }
            );
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Analyze and extract sheets & stats
        const analysis = analyzeWorkbook(buffer, filename);

        if (analysis.sheets.length === 0 || analysis.sheets.every((s) => s.rowCount === 0)) {
            return NextResponse.json(
                { message: "The uploaded file does not contain any readable data rows." },
                { status: 400 }
            );
        }

        // Save into PostgreSQL
        const dataset = await prisma.uploadedDataset.create({
            data: {
                filename: analysis.filename,
                file_size: analysis.fileSize,
                uploaded_by_id: user.id,
                sheets: {
                    create: analysis.sheets.map((sheet, index) => ({
                        sheet_name: sheet.sheetName,
                        row_count: sheet.rowCount,
                        columns: sheet.columns as unknown as object,
                        rows: sheet.rows as unknown as object,
                        summary: {
                            ...sheet.summary,
                            financialMetrics: sheet.financialMetrics,
                        } as unknown as object,
                        sort_order: index,
                    })),
                },
            },
            include: {
                sheets: {
                    select: {
                        id: true,
                        sheet_name: true,
                        row_count: true,
                        columns: true,
                        summary: true,
                        sort_order: true,
                    },
                    orderBy: { sort_order: "asc" },
                },
            },
        });

        return NextResponse.json(
            {
                message: "Excel sheet uploaded and analyzed successfully.",
                dataset,
            },
            { status: 201 }
        );
    } catch (error: unknown) {
        console.error("Upload error:", error);
        const errMsg = error instanceof Error ? error.message : "Failed to process and save Excel file.";
        return NextResponse.json(
            { message: errMsg },
            { status: 400 }
        );
    }
}
