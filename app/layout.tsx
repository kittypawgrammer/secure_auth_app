import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "MIS Dashboard",
    description: "Secure Auth & MIS Dashboard",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="antialiased min-h-screen bg-gray-50 text-gray-900">
                {children}
            </body>
        </html>
    );
}