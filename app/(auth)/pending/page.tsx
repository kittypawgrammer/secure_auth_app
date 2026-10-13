import Link from "next/link";

export const metadata = { title: "Account Pending | MIS Dashboard" };

export default function PendingPage() {
    return (
        <div className="space-y-4 text-center">
            <h1 className="text-xl font-semibold">Waiting for approval</h1>
            <p className="text-sm text-gray-600">
                Your account has been created. An admin needs to approve it before you can sign in.
            </p>
            <Link href="/login" className="text-sm font-medium text-blue-600 hover:underline">
                Back to sign in
            </Link>
        </div>
    );
}
