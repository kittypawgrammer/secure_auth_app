import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireAuth();
        if (!user) {
            return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
        }

        const { id } = await params;

        const dataset = await prisma.uploadedDataset.findUnique({
            where: { id },
            include: {
                sheets: {
                    orderBy: { sort_order: "asc" },
                },
                uploaded_by: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        if (!dataset) {
            return NextResponse.json({ message: "Dataset not found." }, { status: 404 });
        }

        return NextResponse.json({ dataset });
    } catch (error) {
        console.error("Fetch dataset error:", error);
        return NextResponse.json({ message: "Failed to load dataset details." }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await requireAuth();
        if (!user) {
            return NextResponse.json({ message: "Unauthorized." }, { status: 401 });
        }

        const { id } = await params;

        await prisma.uploadedDataset.delete({
            where: { id },
        });

        return NextResponse.json({ message: "Dataset deleted successfully." });
    } catch (error) {
        console.error("Delete dataset error:", error);
        return NextResponse.json({ message: "Failed to delete dataset." }, { status: 500 });
    }
}
