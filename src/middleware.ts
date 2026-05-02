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
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("token")?.value;

  // ── Public routes: allow through ──────────────────────────────
  if (
    pathname === "/" ||
    pathname.startsWith("/impact") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon")
  ) {
    return NextResponse.next();
  }

  // ── No token → redirect to login ─────────────────────────────
  if (!token) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Verify token ─────────────────────────────────────────────
  const payload = await verifyJWT(token);

  if (!payload) {
    const loginUrl = new URL("/login", request.url);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete("token");
    return response;
  }

  // ── Admin routes: require ADMIN role ──────────────────────────
  if (pathname.startsWith("/admin")) {
    if (payload.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  // ── Citizen routes: require any authenticated role ────────────
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/submit") ||
    pathname.startsWith("/history") ||
    pathname.startsWith("/rewards")
  ) {
    if (!payload.role) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
