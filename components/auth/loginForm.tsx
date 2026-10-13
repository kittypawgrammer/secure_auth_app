"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button";

export function LoginForm() {
    const router = useRouter();

    // Form state: what the user types
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    // UI state: error message + loading spinner
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault(); // stop the browser's default full-page reload
        setError("");
        setLoading(true);

        try {
            const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();

            if (res.ok) {
                router.push("/dashboard");
                router.refresh(); // let server components see the new cookie
                return;
            }

            if (data.code === "PENDING") {
                router.push("/pending");
                return;
            }

            setError(data.message ?? "Login failed.");
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1 text-center">
                <h1 className="text-2xl font-semibold">Sign in</h1>
                <p className="text-sm text-gray-500">MIS Dashboard</p>
            </div>

            {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <Input
                label="Email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
            />
            <Input
                label="Password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
            />

            <Button type="submit" loading={loading}>Sign in</Button>

            <p className="text-center text-sm text-gray-600">
                No account?{" "}
                <Link href="/signup" className="font-medium text-blue-600 hover:underline">
                    Sign up
                </Link>
            </p>
        </form>
    );
}