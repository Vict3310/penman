import { KeyRound, Lock, Mail, MonitorSmartphone } from "lucide-react";

import { AccountPageHeader, Panel } from "@/components/account/account-ui";
import { PasswordForm, SignOutOtherDevices } from "@/components/account/forms";
import { countOtherSessions } from "@/lib/auth/current-user";
import { getAccountProfile } from "@/lib/account/queries";
import { requireCustomer } from "@/lib/account/session";
import { formatDate } from "@/lib/utils";

/**
 * Password and session controls.
 *
 * The device count comes from the `sessions` table — real live rows, excluding
 * the one making this request. No token, hash or address is ever read into the
 * page: the count is the whole of what leaves the database, so a screen a
 * customer might have open in public cannot disclose anything worth having.
 */
export default async function AccountSecurityPage() {
  const user = await requireCustomer("/account/security");
  const [otherSessions, profile] = await Promise.all([
    countOtherSessions(),
    getAccountProfile(user.id),
  ]);

  return (
    <>
      <AccountPageHeader
        eyebrow="My account"
        title="Security"
        description="Your password and the devices signed in to this account."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Panel
          title="Change your password"
          description="You will stay signed in here. Every other device is signed out."
        >
          <PasswordForm />
        </Panel>

        <div className="space-y-6">
          <Panel title="Signed-in devices">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sage text-forest">
                <MonitorSmartphone className="h-4 w-4" strokeWidth={1.5} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-black/60">
                  This device, plus {otherSessions} other {otherSessions === 1 ? "session" : "sessions"}.
                </p>
                <p className="mt-1 text-xs text-black/45">
                  {profile?.last_login_at
                    ? `Last sign-in recorded ${formatDate(profile.last_login_at)}.`
                    : "No previous sign-in recorded on this account."}
                </p>
              </div>
            </div>

            <div className="mt-5 border-t border-black/10 pt-5">
              <SignOutOtherDevices otherSessions={otherSessions} />
            </div>
          </Panel>

          <Panel title="How your account is protected" className="bg-sage/25">
            <ul className="space-y-3.5 text-xs leading-relaxed text-black/55">
              <li className="flex gap-2.5">
                <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0 text-forest" strokeWidth={1.5} />
                Passwords are stored only as Argon2id hashes. Nobody here — including the people who
                run the site — can read yours.
              </li>
              <li className="flex gap-2.5">
                <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-forest" strokeWidth={1.5} />
                Sessions are held on the server and referenced by an HttpOnly cookie that JavaScript
                cannot read, so a cross-site scripting bug cannot lift your login.
              </li>
              <li className="flex gap-2.5">
                <MonitorSmartphone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-forest" strokeWidth={1.5} />
                Changing your password revokes every existing session immediately.
              </li>
              <li className="flex gap-2.5">
                <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-forest" strokeWidth={1.5} />
                Self-service password reset by email is not switched on yet. If you are locked out,
                contact us on WhatsApp or by phone and we will restore access after confirming it is
                you.
              </li>
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
