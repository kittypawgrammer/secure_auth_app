import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import { ExcelDashboard } from "@/components/dashboard/ExcelDashboard";

export const metadata = {
    title: "Excel Analytics Dashboard | MIS Dashboard",
    description: "Interactive dashboard for Excel spreadsheets and business data",
};

export default async function DashboardPage() {
    const user = await requireAuth();

    if (!user) {
        redirect("/login");
    }

    return (
        <ExcelDashboard
            user={{
                name: user.name,
                email: user.email,
                is_admin: user.is_admin,
            }}
        />
    );
}
