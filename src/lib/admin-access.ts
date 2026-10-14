import "server-only";

import { getServerClient } from "@/lib/supabase/server";
import { isDemoMode } from "@/lib/demo";
import type { ProfileRole } from "@/lib/types";

export interface AdminUser {
  id: string;
  email: string;
  fullName: string | null;
  role: ProfileRole;
}

export function isExplicitAdminFlag(profile: { is_admin?: unknown; role?: unknown } | null | undefined): boolean {
  if (!profile) return false;

  if (typeof profile.is_admin === "boolean") {
    return profile.is_admin === true;
  }

  if (typeof profile.role === "string") {
    return profile.role === "admin";
  }

  return false;
}

export async function getAdminUser(): Promise<AdminUser | null> {
  if (isDemoMode()) {
    return {
      id: "demo-admin",
      email: "admin@demo.local",
      fullName: "Demo Administrator",
      role: "admin",
    };
  }

  try {
    const supabase = await getServerClient();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) return null;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, full_name, role, is_admin")
      .eq("id", userData.user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Admin access check failed while reading profile:", profileError.message);
      return null;
    }

    if (!isExplicitAdminFlag(profile)) {
      return null;
    }

    return {
      id: userData.user.id,
      email: (profile as { email?: string } | null)?.email ?? userData.user.email ?? "",
      fullName: (profile as { full_name?: string } | null)?.full_name ?? null,
      role: (profile as { role?: string } | null)?.role === "admin" ? "admin" : "viewer",
    };
  } catch (error) {
    console.error("Admin access check crashed:", error);
    return null;
  }
}
