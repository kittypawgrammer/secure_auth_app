import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET() {
    try {
        const user = await requireAuth();
        if (!user) {
            return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
        }

        const datasets = await prisma.uploadedDataset.findMany({
            orderBy: { created_at: "desc" },
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
                uploaded_by: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        return NextResponse.json({ datasets });
    } catch (error) {
        console.error("Fetch datasets error:", error);
        return NextResponse.json({ message: "Failed to load datasets." }, { status: 500 });
    }
}
