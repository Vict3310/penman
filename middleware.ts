import { NextResponse } from "next/server";

/**
 * Keep middleware edge-safe and avoid importing database-backed auth code here.
 * The authoritative admin check lives in the server-side `requireAdmin()` flow.
 */
export function middleware() {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};
