import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { MisWorkspaceClient } from "@/components/mis/MisWorkspaceClient";

export const metadata = {
    title: "MIS Dashboard",
    description: "Upload an Excel file and build your own charts",
};

// Reading the login cookie is per-request data, so with cacheComponents it must sit inside <Suspense>
export default function DashboardPage() {
    return (
        <Suspense fallback={<p className="p-6 text-sm text-gray-500">Loading…</p>}>
            <Dashboard />
        </Suspense>
    );
}

async function Dashboard() {
    const user = await requireAuth();

    if (!user) {
        redirect("/login");
    }

    return (
        <MisWorkspaceClient
            user={{
                name: user.name,
                email: user.email,
                is_admin: user.is_admin,
            }}
        />
    );
}
