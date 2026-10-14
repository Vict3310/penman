import "server-only";
import { notFound } from "next/navigation";

import { getAdminUser as getTrustedAdminUser, type AdminUser } from "@/lib/admin-access";

export type SessionUser = AdminUser;

/** Resolve the signed-in admin user using the database-backed profile decision. */
export async function getAdminUser(): Promise<SessionUser | null> {
  return getTrustedAdminUser();
}

/** Fail closed: no session or non-admin profile => custom 404 page. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getAdminUser();
  if (!user) notFound();
  return user;
}
