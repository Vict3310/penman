"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  BookOpen,
  Building2,
  CarFront,
  ChevronLeft,
  ChevronRight,
  Compass,
  HelpCircle,
  Home,
  Info,
  KeyRound,
  LogOut,
  Menu,
  MessageCircle,
  ShoppingBag,
  UserRound,
  Wrench,
  X,
  type LucideIcon,
} from "lucide-react";

import { signOut } from "@/app/actions/auth";
import {
  getAccountServerSnapshot,
  getAccountSnapshot,
  subscribeToAccount,
} from "@/components/account/account-state";
import { Logo, LogoMark } from "@/components/logo";
import { findSection, isSectionHome } from "@/lib/site-sections";
import { cn } from "@/lib/utils";

/**
 * The persistent sidebar.
 *
 * Every page except the landing page gets this instead of the floating pill
 * navigation: the landing page IS the marketing moment and keeps the full-width
 * header, while the rest of the site behaves like an application with a
 * standing map of where you are.
 *
 * Three behaviours are worth knowing:
 *
 *   * It collapses to icons, and the choice is remembered. The width lives in
 *     the `--rail-w` custom property on <html>, so the content offset follows
 *     without either component reading the other's state.
 *   * Collapsed, a label appears on hover or focus, so an icon is never the
 *     only thing telling you where a link goes.
 *   * Below `md` it is replaced by a compact top bar with a dropdown. A rail
 *     that folds to 5rem still leaves too little room on a 360px phone.
 *
 * The account block comes from /api/account/state on the client rather than
 * from the server, because reading the session cookie during render would make
 * every page that shows this rail uncacheable. See that route's own note.
 */

interface RailLink {
  href: string;
  label: string;
  icon: LucideIcon;
}

interface RailGroup {
  label: string;
  links: RailLink[];
}

/**
 * One icon per menu label.
 *
 * The section menus come from a shared data module that carries no icons, so
 * they are matched by label here — the same five labels recur in all four
 * sections, which is exactly why a label-keyed map is the right shape.
 */
const LINK_ICONS: Record<string, LucideIcon> = {
  Home: Home,
  Cars: CarFront,
  About: Info,
  FAQ: HelpCircle,
  Contact: MessageCircle,
  "How it works": Compass,
  Properties: Building2,
  Services: Wrench,
  "Buying guide": BookOpen,
};

/** The other three sections, always one click away. */
const SECTION_LINKS: RailLink[] = [
  { href: "/autos", label: "Autos home", icon: Home },
  { href: "/rental", label: "Car rental", icon: KeyRound },
  { href: "/shop", label: "Cars for sale", icon: ShoppingBag },
  { href: "/real-estate", label: "Real estate", icon: Building2 },
];

/**
 * What the rail contains on a given route.
 *
 * The current section's own menu comes first, under its own heading: the rental
 * home menu is still the rental home menu, it has simply moved from the top of
 * the page into the sidebar. Below it sit the other three sections, so shop and
 * real estate are never more than one click away — whichever page you happen to
 * be on.
 *
 * There is deliberately no "Company" group here. About and Contact live in the
 * footer of every home page, which is where they are expected on a site like
 * this, and repeating them in the rail only made it longer without making
 * anything easier to find.
 */
function railGroups(pathname: string): RailGroup[] {
  const section = findSection(pathname);
  const groups: RailGroup[] = [];

  if (section) {
    groups.push({
      label: section.title,
      links: section.links.map((link) => ({
        href: link.href,
        label: link.label,
        icon: LINK_ICONS[link.label] ?? Info,
      })),
    });
  }

  groups.push({
    label: "Explore",
    // The section you are already in is listed above, under its own heading,
    // so repeating it here would only be noise.
    links: SECTION_LINKS.filter((link) => link.href !== section?.key),
  });

  return groups;
}

const RAIL_STATE_KEY = "penman_rail_collapsed";

/** Whether the reader collapsed the rail. Unreadable storage means expanded. */
function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(RAIL_STATE_KEY) === "1";
  } catch {
    return false;
  }
}

function storeCollapsed(collapsed: boolean): void {
  try {
    window.localStorage.setItem(RAIL_STATE_KEY, collapsed ? "1" : "0");
  } catch {
    // Private mode or a blocked store: the rail still collapses for this
    // session, the choice just is not remembered.
  }
}

/** The accessible name of the currently active route, computed once. */
function isActivePath(pathname: string, href: string): boolean {
  // A section's own landing page only counts as the active route on that exact
  // page. Prefix matching would light up "Home" and "Cars" together the moment
  // the visitor walked one level into the section.
  if (href === "/" || isSectionHome(href)) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * A label for a collapsed icon, revealed on hover or keyboard focus.
 *
 * Positioned outside the rail's own box, which is why the collapsed rail is
 * `overflow-visible`: clipping here would hide every tooltip.
 */
function RailTip({ label, side = "right" }: { label: string; side?: "right" | "bottom" }) {
  return (
    <span
      className={cn(
        "pointer-events-none absolute z-30 whitespace-nowrap rounded-lg bg-ink px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100",
        side === "right"
          ? "left-full top-1/2 ml-3 -translate-y-1/2"
          : "left-1/2 top-full mt-2 -translate-x-1/2",
      )}
    >
      {label}
    </span>
  );
}

/* ── Account block ───────────────────────────────────────────────────── */

function RailAccount({ collapsed }: { collapsed: boolean }) {
  const { loaded, signedIn, user } = useSyncExternalStore(
    subscribeToAccount,
    getAccountSnapshot,
    getAccountServerSnapshot,
  );

  // Nothing is claimed about the visitor until the answer arrives. Showing
  // "Sign in" and then replacing it with a name would be worse than a moment
  // of neutrality.
  if (!loaded) {
    return (
      <div className={cn("animate-pulse", collapsed ? "flex flex-col items-center gap-2 py-1" : "space-y-2")}>
        <div className={cn("rounded-full bg-black/10", collapsed ? "h-9 w-9" : "h-10 w-full")} />
        {!collapsed && <div className="h-8 w-full rounded-full bg-black/10" />}
      </div>
    );
  }

  if (!signedIn || !user) {
    if (collapsed) {
      return (
        <Link
          href="/login"
          className="group relative grid h-10 w-10 place-items-center rounded-xl text-black/55 transition-colors hover:bg-black/5 hover:text-ink"
        >
          <UserRound className="h-4 w-4" strokeWidth={1.5} />
          <RailTip label="Sign in" />
          <span className="sr-only">Sign in</span>
        </Link>
      );
    }

    return (
      <div className="space-y-2">
        <p className="text-xs leading-relaxed text-black/50">
          Sign in to follow your enquiries and keep the vehicles you like.
        </p>
        <Link href="/login" className="btn-ghost w-full justify-center">
          Sign in
        </Link>
        <Link
          href="/signup"
          className="block text-center text-xs font-medium text-forest underline decoration-forest/30 underline-offset-4 transition-colors hover:decoration-forest"
        >
          Create an account
        </Link>
      </div>
    );
  }

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1.5">
        <Link
          href="/account"
          className="group relative grid h-9 w-9 place-items-center rounded-full bg-forest text-sm font-medium text-white"
        >
          <span aria-hidden="true">{user.initials}</span>
          <RailTip label={user.name} />
          <span className="sr-only">My account</span>
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="group relative grid h-10 w-10 place-items-center rounded-xl text-black/55 transition-colors hover:bg-black/5 hover:text-ink"
          >
            <LogOut className="h-4 w-4" strokeWidth={1.5} />
            <RailTip label="Sign out" />
            <span className="sr-only">Sign out</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-black/10 bg-white/70 p-3">
      <Link href="/account" className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-forest text-sm font-medium text-white"
        >
          {user.initials}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm text-ink">{user.name}</span>
          <span className="block truncate text-xs text-black/45">View my account</span>
        </span>
      </Link>

      {user.isAdmin && (
        <Link
          href="/admin"
          className="mt-3 flex w-full items-center justify-center rounded-xl border border-forest/20 bg-sage/70 px-3 py-2 text-xs font-medium text-forest transition-colors hover:bg-sage"
        >
          Admin panel
        </Link>
      )}

      <form action={signOut}>
        <button
          type="submit"
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-black/10 px-3 py-2 text-sm text-black/60 transition-colors hover:border-red-500/30 hover:bg-red-50 hover:text-red-700"
        >
          <LogOut className="h-3.5 w-3.5" strokeWidth={1.5} />
          Sign out
        </button>
      </form>
    </div>
  );
}

/* ── Desktop rail ────────────────────────────────────────────────────── */

export function SiteRail({
  businessName,
  collapsed,
  onToggle,
}: {
  businessName: string;
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  // Recomputed per route, which is what makes the rail show the menu of the
  // section the visitor is actually in.
  const groups = railGroups(pathname);

  return (
    <aside
      id="site-rail"
      aria-label="Site sidebar"
      data-collapsed={collapsed ? "true" : "false"}
      className="fixed inset-y-0 left-0 z-40 hidden w-[var(--rail-w)] flex-col border-r border-black/10 bg-[#f7f4ee] transition-[width] duration-300 md:flex"
    >
      <div
        className={cn(
          "flex items-center border-b border-black/10",
          collapsed ? "justify-center px-2 py-4" : "px-5 py-5",
        )}
      >
        <Link href="/" aria-label={`${businessName} home`}>
          {collapsed ? <LogoMark /> : <Logo name={businessName} />}
        </Link>
      </div>

      {/*
       * The collapse handle rides the rail's outer edge, halfway down, so it
       * reads as part of the outline rather than as one more menu row.
       */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={!collapsed}
        aria-controls="site-rail"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="group absolute -right-3 top-1/2 z-10 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full border border-black/10 bg-white text-black/55 shadow-sm transition-colors hover:bg-sage hover:text-forest"
      >
        {collapsed ? (
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.5} />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
        )}
        {collapsed && <RailTip label="Expand" />}
      </button>

      {/* Collapsed, the rail must not scroll: hover labels sit outside its box. */}
      <nav
        aria-label="Site"
        className={cn(
          "flex-1",
          collapsed ? "overflow-y-visible px-2 py-3" : "overflow-y-auto px-3 py-5",
        )}
      >
        {groups.map((group) => (
          <div key={group.label} className={collapsed ? "mb-2" : "mb-6"}>
            {!collapsed && (
              <p className="px-3 pb-2.5 text-[10px] uppercase tracking-[0.24em] text-black/35">
                {group.label}
              </p>
            )}
            {collapsed && <div className="mx-auto mb-2 h-px w-6 bg-black/10" aria-hidden="true" />}

            <div className={collapsed ? "flex flex-col items-center gap-0.5" : "space-y-0.5"}>
              {group.links.map((link) => {
                const active = isActivePath(pathname, link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative transition-colors",
                      collapsed
                        ? "grid h-10 w-10 place-items-center rounded-xl"
                        : "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm",
                      active
                        ? "bg-sage text-forest"
                        : "text-black/60 hover:bg-black/[0.04] hover:text-ink",
                    )}
                  >
                    <link.icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                    {collapsed ? <RailTip label={link.label} /> : <span className="truncate">{link.label}</span>}
                    {collapsed && <span className="sr-only">{link.label}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div
        className={cn(
          "border-t border-black/10",
          collapsed ? "px-2 py-3" : "px-4 py-4",
        )}
      >
        <RailAccount collapsed={collapsed} />
      </div>
    </aside>
  );
}

/* ── Mobile bar ──────────────────────────────────────────────────────── */

export function SiteMobileBar({
  businessName,
  open,
  onToggle,
}: {
  businessName: string;
  open: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();
  const groups = railGroups(pathname);

  return (
    <div className="md:hidden">
      <nav
        id="site-mobile-bar"
        aria-label="Primary"
        className="fixed left-1/2 top-3 z-50 w-[calc(100%-1.5rem)] -translate-x-1/2"
      >
        <div className="flex items-center gap-2 rounded-full border border-black/10 bg-white/90 px-2 py-1.5 shadow-xl shadow-black/5 backdrop-blur-md">
          <Link href="/" className="px-2.5 py-1.5" aria-label={`${businessName} home`}>
            <Logo name={businessName} />
          </Link>

          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-controls="site-mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="ml-auto grid h-10 w-10 place-items-center rounded-full text-ink transition-colors hover:bg-black/5"
          >
            {open ? <X className="h-5 w-5" strokeWidth={1.5} /> : <Menu className="h-5 w-5" strokeWidth={1.5} />}
          </button>
        </div>

        {open && (
          <div
            id="site-mobile-menu"
            className="mt-2.5 max-h-[calc(100dvh-6rem)] overflow-y-auto rounded-3xl border border-black/10 bg-white/95 p-3 shadow-2xl shadow-black/15 backdrop-blur-md"
          >
            {groups.map((group) => (
              <div key={group.label} className="mb-2">
                <p className="px-3 pb-1.5 pt-2 text-[10px] uppercase tracking-[0.24em] text-black/35">
                  {group.label}
                </p>
                {group.links.map((link) => {
                  const active = isActivePath(pathname, link.href);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-2xl px-3 py-3 text-base transition-colors",
                        active ? "bg-sage text-forest" : "text-ink hover:bg-black/5",
                      )}
                    >
                      <link.icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            ))}

            <div className="mt-2 border-t border-black/10 px-1 pt-3">
              <RailAccount collapsed={false} />
            </div>
          </div>
        )}
      </nav>
    </div>
  );
}

/**
 * Owns the two pieces of state the rail and the content offset share: whether
 * the rail is collapsed, and whether the mobile menu is open.
 */
export function SiteSidebar({ businessName }: { businessName: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Read the stored preference after mount. Doing it during render would
  // mismatch the server's HTML, since the server cannot read the visitor's
  // localStorage.
  useEffect(() => {
    setCollapsed(readCollapsed());
  }, []);

  // The width lives on <html> so the content offset follows from CSS alone.
  useEffect(() => {
    document.documentElement.dataset.rail = collapsed ? "collapsed" : "expanded";
    storeCollapsed(collapsed);
  }, [collapsed]);

  // A route change closes the menu; leaving it open over a new page is how a
  // navigation ends up needing a second tap.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // The mobile menu is a dropdown, not a modal, so nothing is trapped: Escape
  // simply closes it for keyboard users.
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  return (
    <>
      <SiteRail
        businessName={businessName}
        collapsed={collapsed}
        onToggle={() => setCollapsed((value) => !value)}
      />
      <SiteMobileBar
        businessName={businessName}
        open={menuOpen}
        onToggle={() => setMenuOpen((value) => !value)}
      />
    </>
  );
}
