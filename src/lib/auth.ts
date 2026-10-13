import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAdminEmail, isBetterAuthConfigured } from "@/lib/env";
import { isDemoMode } from "@/lib/demo";
import { auth } from "@/lib/better-auth";
import type { ProfileRole } from "@/lib/types";

export interface SessionUser {
  id: string;
  email: string;
  fullName: string | null;
  role: ProfileRole;
}

/**
 * Resolve the signed-in user and confirm the email is on the server-side allowlist.
 * Better Auth handles the session itself; the deployment allowlist remains the admin gate.
 */
export async function getAdminUser(): Promise<SessionUser | null> {
  if (isDemoMode()) {
    return {
      id: "demo-admin",
      email: "admin@demo.local",
      fullName: "Demo Administrator",
      role: "admin",
    };
  }

  if (!isBetterAuthConfigured()) return null;

  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const user = session?.user;
    if (!user?.email) return null;
    if (!isAdminEmail(user.email)) return null;

    return {
      id: user.id,
      email: user.email,
      fullName: user.name ?? null,
      role: "admin",
    };
  } catch {
    return null;
  }
}

/** Redirect to the login page unless the caller is a verified administrator. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getAdminUser();
  if (!user) redirect("/login?next=/admin");
  return user;
}
