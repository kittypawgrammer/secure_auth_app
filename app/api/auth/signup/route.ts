
import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/db/prisma";

// 1. Define the expected signup data.
const signupSchema = z.object({
    name: z.string().trim().min(2).max(100),
    email: z.string().trim().email().max(254),
    password: z.string().min(12).max(72),
});

// 2. Handle POST requests from the signup form.
export async function POST(request: Request) {
    try {
        // Read the data sent by the frontend.
        const body: unknown = await request.json();

        // Validate the data.
        const result = signupSchema.safeParse(body);

        if (!result.success) {
            return NextResponse.json(
                {
                    message: "Invalid signup details.",
                    errors: result.error.flatten().fieldErrors,
                },
                { status: 400 }
            );
        }

        const name = result.data.name;
        const email = result.data.email.toLowerCase();
        const password = result.data.password;

        // bcrypt accepts a maximum of 72 UTF-8 bytes.
        if (Buffer.byteLength(password, "utf8") > 72) {
            return NextResponse.json(
                { message: "Password is too long." },
                { status: 400 }
            );
        }

        // Check whether the email is already registered.
        const existingUser = await prisma.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            return NextResponse.json(
                { message: "Unable to register with this email address." },
                { status: 409 }
            );
        }

        // Hash the password before storing it.
        const passwordHash = await bcrypt.hash(password, 12);

        // Save the user in PostgreSQL.
        await prisma.user.create({
            data: {
                name,
                email,
                password_hash: passwordHash,
                is_admin: false,
                status: "PENDING",
            },
        });

        return NextResponse.json(
            {
                message:
                    "Signup successful. Please wait for admin approval.",
            },
            { status: 201 }
        );
    } catch {
        return NextResponse.json(
            { message: "Unable to complete signup. Please try again." },
            { status: 500 }
        );
    }
}
