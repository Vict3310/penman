import "server-only";
import { currentUser, auth as getClerkAuth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";

import { getAdminUser as getTrustedAdminUser, type AdminUser } from "@/lib/admin-access";
import { getServerClient } from "@/lib/supabase/server";
import { isClerkConfigured } from "@/lib/env";

export type SessionUser = AdminUser;

async function getClerkSessionUser(): Promise<{ id: string; email: string; fullName: string | null } | null> {
  if (!isClerkConfigured()) return null;

  try {
    const { userId } = await getClerkAuth();
    if (!userId) return null;

    const clerkUser = await currentUser();
    if (!clerkUser) return null;

    const email = clerkUser.emailAddresses[0]?.emailAddress ?? "";
    const fullName = clerkUser.firstName && clerkUser.lastName ? `${clerkUser.firstName} ${clerkUser.lastName}` : clerkUser.firstName ?? clerkUser.lastName ?? null;

    return { id: clerkUser.id, email, fullName };
  } catch {
    return null;
  }
}

/** Resolve the signed-in admin user using the trusted database profile check. */
export async function getAdminUser(): Promise<SessionUser | null> {
  const clerkUser = await getClerkSessionUser();
  if (clerkUser && clerkUser.email) {
    try {
      const supabase = await getServerClient();
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, is_admin")
        .ilike("email", clerkUser.email)
        .maybeSingle();

      if (!error && profile && (profile.role === "admin" || profile.is_admin === true)) {
        return {
          id: profile.id,
          email: profile.email ?? clerkUser.email,
          fullName: profile.full_name ?? clerkUser.fullName,
          role: profile.role === "admin" ? "admin" : "viewer",
        };
      }
    } catch {
      // Fall back to the existing trusted Supabase admin check below.
    }
  }

  return getTrustedAdminUser();
}

/** Fail closed: no session or non-admin profile => custom 404 page. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getAdminUser();
  if (!user) notFound();
  return user;
}
