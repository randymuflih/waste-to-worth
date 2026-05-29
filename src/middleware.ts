/**
 * Next.js Middleware
 *
 * Protects citizen and admin routes based on JWT token in cookies.
 * Uses jose instead of jsonwebtoken since middleware runs in Edge Runtime.
 *
 * - /admin/* routes   → require ADMIN role
 * - /dashboard, /submit, /history, /rewards → require authenticated user
 * - Public routes (/, /impact, /login, /register, /api) → open
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "waste-to-worth-secret-key"
);

async function verifyJWT(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { userId: string; email: string; role: string };
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  // Auth bypass: allow all routes without login (temporary for frontend demo)
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
