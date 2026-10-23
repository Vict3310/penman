"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bookmark,
  LayoutDashboard,
  LogOut,
  MessageSquareText,
  ShieldCheck,
  UserRound,
} from "lucide-react";

import { signOut } from "@/app/actions/auth";
import { cn } from "@/lib/utils";

/**
 * Account navigation.
 *
 * One list, two presentations: a sticky vertical panel beside the content from
 * `lg` upward, and a horizontally scrollable row of pills below that. The
 * mobile form is a scroller rather than a hamburger because there are only
 * five destinations — hiding them behind a tap would cost more than it saves,
 * and a scroller keeps every target a comfortable size at 320px, where a
 * five-across row of tabs would not.
 */

const LINKS = [
  { href: "/account", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/account/enquiries", label: "My enquiries", icon: MessageSquareText },
  { href: "/account/saved", label: "Saved vehicles", icon: Bookmark },
  { href: "/account/profile", label: "Personal information", icon: UserRound },
  { href: "/account/security", label: "Security", icon: ShieldCheck },
] as const;

export function AccountNav({
  fullName,
  email,
  initials,
  isAdmin,
  enquiryCount,
  savedCount,
}: {
  fullName: string;
  email: string;
  initials: string;
  /** Verified server-side before this component was rendered. */
  isAdmin: boolean;
  enquiryCount: number;
  savedCount: number;
}) {
  const pathname = usePathname();

  const countFor = (href: string) => {
    if (href === "/account/enquiries") return enquiryCount;
    if (href === "/account/saved") return savedCount;
    return 0;
  };

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav aria-label="Account sections" className="min-w-0 lg:sticky lg:top-28">
      {/* ── Identity ─────────────────────────────────────────────── */}
      <div className="hidden items-center gap-3 rounded-2xl border border-black/10 bg-white p-4 lg:flex">
        <span
          aria-hidden="true"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-forest text-sm font-medium text-white"
        >
          {initials}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium text-ink">{fullName}</span>
          <span className="block truncate text-xs text-black/50" title={email}>
            {email}
          </span>
        </span>
      </div>

      {/* ── Destinations ─────────────────────────────────────────── */}
      <ul
        className={cn(
          "-mx-6 mt-5 flex w-[calc(100%+3rem)] gap-2 overflow-x-auto px-6 pb-1 lg:mx-0 lg:mt-4 lg:w-full lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0",
          "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        )}
      >
        {LINKS.map((link) => {
          const active = isActive(link.href, "exact" in link ? link.exact : undefined);
          const count = countFor(link.href);

          return (
            <li key={link.href} className="shrink-0 lg:shrink">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2.5 whitespace-nowrap rounded-full border px-4 py-2.5 text-sm transition-colors duration-200 lg:rounded-xl lg:px-3.5 lg:py-3",
                  active
                    ? "border-forest/20 bg-sage font-medium text-forest"
                    : "border-black/10 bg-white text-black/65 hover:border-black/15 hover:bg-black/[0.03] hover:text-ink",
                )}
              >
                <link.icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                <span>{link.label}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      "ml-auto hidden rounded-full px-2 py-0.5 text-[11px] font-medium lg:inline-block",
                      active ? "bg-white/70 text-forest" : "bg-black/5 text-black/55",
                    )}
                  >
                    {count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* ── Exit + administration ────────────────────────────────── */}
      <div className="mt-4 flex items-center gap-2 lg:mt-6 lg:flex-col lg:items-stretch lg:gap-1">
        {/*
         * Only rendered when the server has already confirmed the role from
         * the database. It is a link, not a gate: /admin performs the same
         * check again on every request, so hiding it is presentation and
         * nothing more.
         */}
        {isAdmin && (
          <Link
            href="/admin"
            className="hidden items-center gap-2.5 rounded-xl px-3.5 py-3 text-sm text-black/55 transition-colors hover:bg-black/[0.03] hover:text-ink lg:flex"
          >
            <ShieldCheck className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            Admin panel
          </Link>
        )}

        <form action={signOut} className="shrink-0 lg:w-full">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2.5 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm text-black/65 transition-colors hover:border-red-500/30 hover:bg-red-50 hover:text-red-700 lg:justify-start lg:rounded-xl lg:px-3.5 lg:py-3"
          >
            <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.5} />
            Sign out
          </button>
        </form>
      </div>
    </nav>
  );
}
