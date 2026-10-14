import { cookies } from "next/headers";
import { jwtVerify, SignJWT } from "jose";
import { prisma } from "@/lib/db/prisma";

const ISSUER = "secure-auth-app";
const AUDIENCE = "secure-auth-app-users";
const COOKIE_NAME = "auth_token";
const TOKEN_EXPIRY = "15m"; // 15-minute token lifespan

/**
 * Returns the encoded secret key.
 * Enforces that JWT_SECRET is present and has at least 32 characters (256 bits).
 */
function getSecretKey(): Uint8Array {
    const secret = process.env.JWT_SECRET;

    if (!secret || secret.length < 32) {
        throw new Error("JWT_SECRET must be configured and at least 32 characters long.");
    }

    return new TextEncoder().encode(secret);
}


export async function getCurrentUser() {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
        return null;
    }

    const secretKey = getSecretKey();
    let payload: { sub?: string; ver?: number };

    // 1. Verify token signature, expiration, and claims.
    // Only catch JWT verification errors here (e.g. expired or tampered tokens).
    try {
        const verified = await jwtVerify(token, secretKey, {
            algorithms: ["HS256"],
            issuer: ISSUER,
            audience: AUDIENCE,
        });
        payload = verified.payload as { sub?: string; ver?: number };
    } catch {
        // Expired, tampered, or invalid tokens are treated as unauthenticated.
        return null;
    }

    if (typeof payload.sub !== "string") {
        return null;
    }

    // 2. Fetch the current user from the database.
    // Database errors are NOT caught here, allowing them to properly surface as 500 errors.
    const user = await prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
            id: true,
            name: true,
            email: true,
            is_admin: true,
            status: true,
            token_version: true,
        },
    });

    // 3. Enforce account status and token revocation check.
    if (!user || user.status !== "APPROVED") {
        return null;
    }

    // If the token version in the payload does not match the database version, the token was revoked.
    if (typeof payload.ver === "number" && payload.ver !== user.token_version) {
        return null;
    }

    return user;
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
 * Creates a signed JWT with the current token_version and sets the HTTP-only cookie.
 */
export async function createSession(userId: string) {
    const secretKey = getSecretKey();

    // Fetch user's current token_version from DB to embed in the token
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { token_version: true },
    });

    const tokenVersion = user?.token_version ?? 0;

    const token = await new SignJWT({ ver: tokenVersion })
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setSubject(userId)
        .setIssuer(ISSUER)
        .setAudience(AUDIENCE)
        .setIssuedAt()
        .setExpirationTime(TOKEN_EXPIRY)
        .sign(secretKey);

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 15 * 60, // 15 minutes
    });

    return token;
}

/**
 * Clears the session cookie and revokes the token server-side by incrementing token_version.
 */
export async function destroySession() {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (token) {
        try {
            const secretKey = getSecretKey();
            const { payload } = await jwtVerify(token, secretKey, {
                algorithms: ["HS256"],
                issuer: ISSUER,
                audience: AUDIENCE,
            });

            if (typeof payload.sub === "string") {
                // Invalidate this token (and all prior tokens) in the database immediately
                await prisma.user.update({
                    where: { id: payload.sub },
                    data: { token_version: { increment: 1 } },
                });
            }
        } catch {
            // Token was already expired or invalid; proceed with deleting cookie
        }
    }

    cookieStore.delete(COOKIE_NAME);
}

/**
 * CSRF defense-in-depth: verifies the request Origin/Referer matches the Host header for state-changing requests.
 */
export function validateRequestOrigin(request: Request): boolean {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");

    if (!origin || !host) {
        return true;
    }

    try {
        const originUrl = new URL(origin);
        return originUrl.host === host;
    } catch {
        return false;
    }
}
