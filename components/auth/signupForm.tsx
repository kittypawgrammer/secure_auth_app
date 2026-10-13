"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// Shape of the per-field errors coming from the API (Zod flatten)
type FieldErrors = {
    name?: string[];
    email?: string[];
    password?: string[];
    confirmPassword?: string[];
};

export function SignupForm() {
    // One state object for all fields instead of 4 separate useStates
    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);

    // One change handler for every input, using the input's "name"
    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setForm({ ...form, [e.target.name]: e.target.value });
    }

    // Quick checks in the browser, for instant feedback.
    // The server still validates everything again.
    function validate(): FieldErrors {
        const errs: FieldErrors = {};
        if (form.name.trim().length < 2) errs.name = ["Name must be at least 2 characters."];
        if (form.password.length < 6) errs.password = ["Password must be at least 6 characters."];
        if (form.password !== form.confirmPassword)
            errs.confirmPassword = ["Passwords do not match."];
        return errs;
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError("");

        const errs = validate();
        setFieldErrors(errs);
        if (Object.keys(errs).length > 0) return; // stop, don't call the API

        setLoading(true);
        try {
            const res = await fetch("/api/auth/signup", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                // confirmPassword is NOT sent, the server doesn't need it
                body: JSON.stringify({
                    name: form.name,
                    email: form.email,
                    password: form.password,
                }),
            });
            const data = await res.json();

            if (res.status === 201) {
                setSuccess(true);
                return;
            }
            if (res.status === 400 && data.errors) {
                setFieldErrors(data.errors); // show server errors under each field
                return;
            }
            setError(data.message ?? "Signup failed.");
        } catch {
            setError("Network error. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    // After signup: replace the form with a message
    if (success) {
        return (
            <div className="space-y-4 text-center">
                <h1 className="text-xl font-semibold">Account created</h1>
                <p className="text-sm text-gray-600">
                    An admin needs to approve your account before you can sign in.
                    You'll get an email once it's approved.
                </p>
                <Link href="/login" className="text-sm font-medium text-blue-600 hover:underline">
                    Go to sign in
                </Link>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="space-y-1 text-center">
                <h1 className="text-2xl font-semibold">Create account</h1>
                <p className="text-sm text-gray-500">MIS Dashboard</p>
            </div>

            {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
            )}

            <Input label="Full name" name="name" autoComplete="name"
                value={form.name} onChange={handleChange} error={fieldErrors.name?.[0]} />

            <Input label="Email" name="email" type="email" autoComplete="email"
                value={form.email} onChange={handleChange} error={fieldErrors.email?.[0]} />

            <Input label="Password" name="password" type="password" autoComplete="new-password"
                value={form.password} onChange={handleChange} error={fieldErrors.password?.[0]} />
            <Input label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password"
                value={form.confirmPassword} onChange={handleChange} error={fieldErrors.confirmPassword?.[0]} />

            <Button type="submit" loading={loading}>Sign up</Button>

            <p className="text-center text-sm text-gray-600">
                Already have an account?{" "}
                <Link href="/login" className="font-medium text-blue-600 hover:underline">Sign in</Link>
            </p>
        </form>
    );
}