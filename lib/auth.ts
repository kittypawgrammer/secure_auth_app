
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { SignJWT } from "jose";
import { prisma } from "@/lib/db/prisma";

export async function getCurrentUser() {
    const token = (await cookies()).get("auth_token")?.value;

    if (!token) {
        return null;
    }

    const secret = process.env.JWT_SECRET;

    if (!secret) {
        throw new Error("JWT_SECRET is not configured.");
    }

    try {
        const secretKey = new TextEncoder().encode(secret);

        // Verify the JWT signature, algorithm and standard claims.
        const { payload } = await jwtVerify(token, secretKey, {
            algorithms: ["HS256"],
            issuer: "secure-auth-app",
            audience: "secure-auth-app-users",
        });

        if (typeof payload.sub !== "string") {
            return null;
        }

        // Fetch the current user instead of trusting stale JWT role/status data.
        const user = await prisma.user.findUnique({
            where: { id: payload.sub },
            select: {
                id: true,
                name: true,
                email: true,
                is_admin: true,
                status: true,
            },
        });

        // Enforce current account status from the database.
        if (!user || user.status !== "APPROVED") {
            return null;
        }

        return user;
    } catch {
        // Missing, expired or invalid tokens are treated as unauthenticated.
        return null;
    }
}

export async function requireAuth() {
    return getCurrentUser();
}

export async function requireAdmin() {
    const user = await getCurrentUser();

    if (!user || !user.is_admin) {
        return null;
    }

    return user;
}


/**
 * Creates a signed JWT and sets the HTTP-only cookie upon successful login.
 */
export async function createSession(userId: string) {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is not configured.");
    }
    const secretKey = new TextEncoder().encode(secret);
    // Sign token matching your exact verification rules
    const token = await new SignJWT()
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setSubject(userId)
        .setIssuer("secure-auth-app")
        .setAudience("secure-auth-app-users")
        .setIssuedAt()
        .setExpirationTime("15m") // 15-minute expiration
        .sign(secretKey);
    // Set HTTP-only cookie
    (await cookies()).set("auth_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 15 * 60, // 15 minutes
    });
    return token;
}
/**
 * Clears the session cookie upon logout.
 */
export async function destroySession() {
    (await cookies()).delete("auth_token");
}

