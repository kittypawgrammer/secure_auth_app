import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/db/prisma";

// Schema for signup input
const signupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: z.string().trim().toLowerCase().email("Please provide a valid email address."),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters.")
    .max(72, "Password must be at most 72 characters."),
});

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();

    // 1. Validate fields with Zod
    const parsed = signupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          message: "Invalid signup details.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { name, email, password } = parsed.data;

    // 2. Check if the user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { message: "An account with this email already exists." },
        { status: 409 }
      );
    }

    // 3. Hash password with bcrypt
    const password_hash = await bcrypt.hash(password, 12);

    // 4. Create user in database with PENDING status
    await prisma.user.create({
      data: {
        name,
        email,
        password_hash,
        status: "PENDING",
        is_admin: false,
      },
    });

    return NextResponse.json(
      {
        message: "Registration successful. An admin needs to approve your account before you can sign in.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { message: "Unable to process signup. Please try again." },
      { status: 500 }
    );
  }
}
