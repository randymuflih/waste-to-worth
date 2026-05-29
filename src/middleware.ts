import { NextResponse } from "next/server";

// Auth bypass: allow all routes without login (temporary for frontend demo)
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
