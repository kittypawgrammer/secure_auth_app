import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/db/prisma";
import { createSession } from "@/lib/auth";

// 1. Shape of the data we expect
const loginSchema = z.object({
    email: z.string().trim().email(),
    password: z.string().min(1).max(72),
});

export async function POST(request: Request) {
    try {
        // 2. Validate input on the server
        const result = loginSchema.safeParse(await request.json());
        if (!result.success) {
            return NextResponse.json({ message: "Invalid login details." }, { status: 400 });
        }

        // 3. Find the user (emails are stored lowercase)
        const email = result.data.email.toLowerCase();
        const user = await prisma.user.findUnique({ where: { email } });

        // 4. Compare the typed password with the stored hash
        const passwordOk =
            user && (await bcrypt.compare(result.data.password, user.password_hash));

        if (!user || !passwordOk) {
            return NextResponse.json({ message: "Invalid email or password." }, { status: 401 });
        }

        // 5. Approval gate
        if (user.status === "PENDING") {
            return NextResponse.json(
                { code: "PENDING", message: "Your account is waiting for admin approval." },
                { status: 403 }
            );
        }
        if (user.status !== "APPROVED") {
            return NextResponse.json({ message: "Your account is not active." }, { status: 403 });
        }

        // 6. Create the JWT and set the cookie
        await createSession(user.id);

        return NextResponse.json({ message: "Logged in.", isAdmin: user.is_admin });
    } catch {
        return NextResponse.json({ message: "Unable to log in. Please try again." }, { status: 500 });
    }
}