import { ShieldCheck } from "lucide-react";

import { AccountPageHeader, DetailRow, Panel } from "@/components/account/account-ui";
import { ProfileForm } from "@/components/account/forms";
import { getAccountProfile } from "@/lib/account/queries";
import { requireCustomer } from "@/lib/account/session";
import { formatDate } from "@/lib/utils";

/**
 * The customer's own details.
 *
 * Every field is prefilled from the database row, not from the session cookie,
 * so what is shown is what is stored. The protected columns — `role`, `status`
 * and `password_hash` — are named here only to say that they cannot be edited
 * from this page, which is true by construction: the update statement and its
 * parameter list in src/lib/auth/users.ts do not mention them.
 */
export default async function AccountProfilePage() {
  const user = await requireCustomer("/account/profile");
  const profile = await getAccountProfile(user.id);

  const emailVerified = Boolean(profile?.email_verified_at);

  return (
    <>
      <AccountPageHeader
        eyebrow="My account"
        title="Personal information"
        description="The details we use to reach you about your enquiries."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Panel title="Your details">
          <ProfileForm
            initialFullName={profile?.full_name ?? user.fullName ?? ""}
            initialEmail={profile?.email ?? user.email}
            initialPhone={profile?.phone ?? ""}
          />
        </Panel>

        <div className="space-y-6">
          <Panel title="Account">
            <dl className="divide-y divide-black/5">
              <DetailRow
                label="Member since"
                value={profile?.created_at ? formatDate(profile.created_at) : "—"}
              />
              <DetailRow
                label="Last sign-in"
                value={profile?.last_login_at ? formatDate(profile.last_login_at) : "This session"}
              />
              <DetailRow
                label="Email"
                value={
                  emailVerified ? (
                    <span className="inline-flex items-center gap-1.5 text-forest">
                      <ShieldCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
                      Verified
                    </span>
                  ) : (
                    <span className="text-black/55">Unverified</span>
                  )
                }
              />
            </dl>

            {!emailVerified && (
              <p className="mt-4 rounded-xl bg-black/[0.03] p-3.5 text-xs leading-relaxed text-black/50">
                We do not send verification emails yet, so this stays unverified and nothing is
                blocked because of it. It will be enforced once email delivery is configured.
              </p>
            )}
          </Panel>

          <Panel title="What you can change" className="bg-sage/25">
            <ul className="space-y-2.5 text-sm text-black/60">
              <li>Your name, phone number and email address.</li>
              <li>Your password and your signed-in devices, under Security.</li>
            </ul>
            <p className="mt-4 border-t border-black/10 pt-4 text-xs leading-relaxed text-black/50">
              Your account permissions and status are not editable from the account area. Access to
              the administration area is granted by an existing administrator, and this page has no
              way to ask for it.
            </p>
          </Panel>
        </div>
      </div>
    </>
  );
}
