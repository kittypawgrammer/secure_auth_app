export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
            <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow">
                {children}
            </div>
        </main>
    );
}
