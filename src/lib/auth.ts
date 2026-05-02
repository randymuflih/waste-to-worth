/**
 * Auth Utilities
 *
 * JWT token helpers (using jose for Edge-compatible signing/verification)
 * and password hashing via bcrypt.
 * JWT tokens are stored in httpOnly cookies for security.
 */

import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";

// ─── Types ──────────────────────────────────────────────────────

export interface TokenPayload {
  userId: string;
  email: string;
  role: "CITIZEN" | "ADMIN";
}

// ─── JWT Helpers ────────────────────────────────────────────────

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "waste-to-worth-secret-key"
);

/**
 * Sign a JWT token with user payload
 */
export async function signToken(payload: TokenPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .setIssuedAt()
    .sign(JWT_SECRET);
}

/**
 * Verify and decode a JWT token
 */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Extract token from request cookies
 */
export function getTokenFromRequest(request: NextRequest): string | null {
  return request.cookies.get("token")?.value || null;
}

/**
 * Get authenticated user from request
 */
export async function getAuthUser(request: NextRequest): Promise<TokenPayload | null> {
  const token = getTokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}

// ─── Password Helpers ───────────────────────────────────────────

const SALT_ROUNDS = 12;

/**
 * Hash a plain-text password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare plain-text password against a hash
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
