import Link from "next/link";
import {
  ArrowRight,
  Bookmark,
  GaugeCircle,
  MessageSquareText,
  Sparkles,
} from "lucide-react";

import {
  AccountPageHeader,
  ActivityTimeline,
  CompletionMeter,
  Panel,
  SummaryCard,
} from "@/components/account/account-ui";
import { firstNameFrom, initialsFrom, relativeTime, computeProfileCompletion } from "@/lib/account/profile";
import { getAccountOverview, getAccountProfile } from "@/lib/account/queries";
import { requireCustomer } from "@/lib/account/session";

/**
 * The account overview.
 *
 * This opens on information the customer can act on, not on a restatement of
 * their own name and email. Every number is counted from real rows — the three
 * enquiry tables, the three saved-listing tables and the profile row's own
 * timestamps — and each card links to the place where the number can be
 * changed. Where a customer has nothing yet, the card says zero and the panel
 * invites them somewhere useful, rather than inventing a plausible figure.
 */
export default async function AccountOverviewPage() {
  const user = await requireCustomer("/account");
  const profile = await getAccountProfile(user.id);

  const [overview, completion] = await Promise.all([
    getAccountOverview(user.id, profile),
    Promise.resolve(
      computeProfileCompletion({
        full_name: profile?.full_name ?? user.fullName,
        email: user.email,
        phone: profile?.phone ?? null,
        password_hash: profile?.password_hash ?? null,
        email_verified_at: profile?.email_verified_at
          ? new Date(profile.email_verified_at).toISOString()
          : null,
      }),
    ),
  ]);

  const fullName = profile?.full_name?.trim() || user.fullName?.trim() || user.email;
  const latest = overview.activity[0] ?? null;

  return (
    <>
      <AccountPageHeader
        eyebrow="My account"
        title={`Welcome back, ${firstNameFrom(fullName, user.email)}`}
        description="Manage your enquiries, saved vehicles and account details — all in one place."
      />

      {/* ── Welcome banner ──────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-[28px] border border-forest/15 bg-gradient-to-br from-sage/70 via-cream to-cream p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span
              aria-hidden="true"
              className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-forest text-base font-medium text-white shadow-lg shadow-forest/25"
            >
              {initialsFrom(fullName, user.email)}
            </span>
            <div className="min-w-0">
              <p className="font-display text-xl font-light tracking-tight text-ink">{fullName}</p>
              <p className="truncate text-sm text-black/55">{user.email}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <Link href="/rental/cars" className="btn-primary justify-center">
              Browse available cars
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </Link>
            <Link
              href="/account/enquiries"
              className="btn-ghost justify-center border-black/15 bg-white/80"
            >
              View my enquiries
            </Link>
          </div>
        </div>
      </section>

      {/* ── Summary cards ───────────────────────────────────────── */}
      <h2 className="sr-only">Account summary</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="My enquiries"
          value={overview.enquiryCount}
          hint={
            overview.enquiryCount === 0
              ? "Nothing sent yet — browse cars and send your first enquiry."
              : overview.awaitingReplyCount > 0
                ? `${overview.awaitingReplyCount} still waiting on our reply.`
                : "Every enquiry has been answered."
          }
          href="/account/enquiries"
          icon={MessageSquareText}
          accent
        />

        <SummaryCard
          label="Saved vehicles"
          value={overview.savedCount}
          hint={
            overview.savedCount === 0
              ? "Tap the bookmark on any listing to keep it here."
              : "Kept on your account across every device."
          }
          href="/account/saved"
          icon={Bookmark}
        />

        <SummaryCard
          label="Recent activity"
          value={latest ? relativeTime(latest.createdAt) : "—"}
          hint={latest ? latest.title : "Your enquiry and saved-listing activity appears here."}
          icon={Sparkles}
        />

        <SummaryCard
          label="Profile completion"
          value={`${completion.percent}%`}
          hint={
            completion.percent === 100
              ? "Your account details are complete."
              : `${completion.done} of ${completion.total} items done.`
          }
          href="/account/profile"
          icon={GaugeCircle}
        />
      </div>

      {/* ── Completion detail ───────────────────────────────────── */}
      {completion.percent < 100 && (
        <Panel
          className="mt-6"
          title="Finish setting up your account"
          description="A phone number means we can reach you about an enquiry without waiting on email."
        >
          <CompletionMeter percent={completion.percent} />
          <ul className="mt-4 space-y-2">
            {completion.items
              .filter((item) => !item.done)
              .map((item) => (
                <li key={item.key} className="flex items-center gap-2.5 text-sm text-black/65">
                  <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-forest/60" />
                  <Link
                    href={item.href}
                    className="underline decoration-black/15 underline-offset-4 transition-colors hover:text-ink hover:decoration-forest"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
          </ul>
        </Panel>
      )}

      {/* ── Recent activity ─────────────────────────────────────── */}
      <Panel
        className="mt-6"
        title="Recent activity"
        description="What has happened on your account, newest first."
        action={{ href: "/account/enquiries", label: "All enquiries" }}
      >
        <ActivityTimeline items={overview.activity} />
      </Panel>
    </>
  );
}
