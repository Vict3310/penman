import type { Metadata } from "next";

import { AccountNav } from "@/components/account/account-nav";
import { getAccountNavCounts, getAccountProfile } from "@/lib/account/queries";
import { initialsFrom } from "@/lib/account/profile";
import { requireCustomer } from "@/lib/account/session";

/**
 * The account area shell.
 *
 * This layout owns two things: the guard every account route sits behind, and
 * the navigation they share.
 *
 * The guard is `requireCustomer()`, which resolves the session cookie against
 * the database on the server. It is the reason a nested account page cannot
 * forget to check for a session — a page would have to opt out of this layout
 * to escape it. The edge middleware redirects the no-cookie case first, but
 * that is an optimisation; this is the control.
 *
 * `force-dynamic` is correct rather than a cost: every one of these pages is
 * specific to the signed-in customer, so there is nothing here worth caching
 * and a cached account page would be a data leak.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My account",
  robots: { index: false, follow: false },
};

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireCustomer("/account");

  const [profile, counts] = await Promise.all([
    getAccountProfile(user.id),
    getAccountNavCounts(user.id),
  ]);

  const fullName = profile?.full_name?.trim() || user.fullName?.trim() || user.email;

  return (
    <div className="pb-24 pt-32 sm:pb-32 sm:pt-40">
      <div className="shell">
        {/*
         * `min-w-0` on both columns is load-bearing, not cosmetic. A grid item
         * defaults to `min-width: auto`, so the section navigation's
         * horizontally scrolling pill row would size this column to its own
         * max-content width and push the whole PAGE sideways on a phone —
         * measured at 500px of overflow on a 320px screen before this.
         * Allowing the column to shrink lets the scroller scroll internally,
         * which is what it was always meant to do.
         */}
        <div className="grid gap-8 lg:grid-cols-[264px_minmax(0,1fr)] lg:gap-12">
          <AccountNav
            fullName={fullName}
            email={user.email}
            initials={initialsFrom(fullName, user.email)}
            // Verified from the database by requireCustomer() above, before
            // this component was reached. Never inferred from anything the
            // browser sent.
            isAdmin={user.role === "admin"}
            enquiryCount={counts.enquiryCount}
            savedCount={counts.savedCount}
          />

          <div className="min-w-0 overflow-x-hidden">{children}</div>
        </div>
      </div>
    </div>
  );
}
