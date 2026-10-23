import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/current-user";
import type { SessionUser } from "@/lib/auth/session";

/**
 * The signed-in customer for this request.
 *
 * Wrapped in React's `cache()` so the layout and the page sharing a request
 * share one database round trip. Without it, every account page would resolve
 * the same session twice — once to render the navigation, once to load the
 * content — for no benefit.
 */
export const currentCustomer = cache(async (): Promise<SessionUser | null> => getSessionUser());

/**
 * The authoritative account guard.
 *
 * This is the check that actually protects the account area. Unlike the edge
 * middleware (which can only see whether a cookie exists), this resolves the
 * cookie against the database, so an expired, revoked or disabled session is
 * refused even though the cookie is present and perfectly well-formed.
 *
 * `nextPath` is the page the visitor asked for, used to bring them back after
 * they sign in. It is the caller's own literal — never a query parameter —
 * which is why no validation is needed here; `safeInternalPath()` guards the
 * places where the value does come from the browser.
 */
export async function requireCustomer(nextPath: string): Promise<SessionUser> {
  const user = await currentCustomer();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  return user;
}
