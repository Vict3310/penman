import { LockKeyhole, ShieldCheck, UserRound } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/ui";
import { requireAdminPage } from "@/lib/auth/admin";

export const dynamic = "force-dynamic";

export default async function AccountSettingsPage() {
  const user = await requireAdminPage();

  return (
    <>
      <AdminPageHeader title="Account" description="Administrator profile and access details." />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="card-surface p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-900 text-white">
            <UserRound className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-black/40">Profile</p>
          <h2 className="mt-2 font-display text-2xl tracking-tight">{user.fullName ?? "Administrator"}</h2>
          <p className="mt-2 text-sm text-black/55">{user.email}</p>
        </div>

        <div className="card-surface p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-900">
            <ShieldCheck className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-black/40">Access</p>
          <p className="mt-2 text-sm text-black/65">Administrator access is enforced server-side and cannot be granted by frontend routing alone.</p>
        </div>

        <div className="card-surface p-5">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-900">
            <LockKeyhole className="h-5 w-5" strokeWidth={1.5} />
          </div>
          <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-black/40">Security</p>
          <p className="mt-2 text-sm text-black/65">Sensitive operations remain protected by server validation and the existing Supabase authorization rules.</p>
        </div>
      </div>
    </>
  );
}
