import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_NAME } from "@/lib/auth/session-cookie";

/**
 * Account-area gate, at the edge.
 *
 * (This file was `src/middleware.ts`; Next 16 renamed that convention to
 * `proxy`, and the project already used a `src/proxy.ts` before the identity
 * layer was replaced. Same job, current name.)
 *
 * WHAT THIS IS: a convenience that turns the common case — a visitor with no
 * session cookie at all, following a link to /account/enquiries — into a
 * single redirect that remembers where they were going. It checks only that a
 * cookie EXISTS; it cannot tell a valid session from a stale one, because
 * resolving a session needs the database and this runs before any request
 * handler.
 *
 * WHAT THIS IS NOT: the access control. It is not, and must never be treated
 * as, the thing that keeps account data safe. The authoritative check is
 * `requireCustomer()` in src/lib/account/session.ts, which the account layout
 * runs on the server, resolving the cookie against the database and rejecting
 * a revoked, expired or disabled session. A request that somehow bypassed this
 * would still reach the layout and still be refused.
 *
 * The `?next=` value this builds is validated by `safeInternalPath()` before
 * it is ever used, so it cannot become an off-site redirect.
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has(SESSION_COOKIE_NAME)) {
    // Let the server decide: an expired or revoked cookie still has to be
    // caught, and only the database can tell the difference.
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;

  return NextResponse.redirect(url);
}

/**
 * Scoped to the account area only, so no visitor browsing the public site
 * pays for this.
 */
export const config = {
  matcher: ["/account/:path*"],
};
