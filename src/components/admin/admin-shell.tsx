"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Building2,
  CarFront,
  ChevronRight,
  ExternalLink,
  FileDown,
  FileText,
  FolderOpen,
  ImageIcon,
  LayoutDashboard,
  LogOut,
  Mail,
  Menu,
  Package,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  Tags,
  UserRound,
  X,
  type LucideIcon,
} from "lucide-react";
import { LogoMark } from "@/components/logo";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Main",
    items: [{ href: "/admin", label: "Overview", icon: LayoutDashboard }],
  },
  {
    title: "Business management",
    items: [
      { href: "/admin/rentals", label: "Rentals", icon: CarFront },
      { href: "/admin/real-estate", label: "Real Estate", icon: Building2 },
      { href: "/admin/shop", label: "Vehicle sales", icon: Package },
    ],
  },
  {
    title: "Customer management",
    items: [
      { href: "/admin/enquiries", label: "All enquiries", icon: Mail },
      { href: "/admin/enquiries/rentals", label: "Rental enquiries", icon: CarFront },
      { href: "/admin/enquiries/properties", label: "Property enquiries", icon: Building2 },
      { href: "/admin/enquiries/shop", label: "Vehicle sales enquiries", icon: ShoppingBag },
      { href: "/admin/orders", label: "Purchase enquiries", icon: FileText },
    ],
  },
  {
    title: "Website",
    items: [
      { href: "/admin/categories", label: "Categories", icon: Tags },
      { href: "/admin/import", label: "Inventory import", icon: FileDown },
      { href: "/admin/media", label: "Media library", icon: ImageIcon },
      { href: "/admin/content", label: "Website content", icon: FolderOpen },
    ],
  },
  {
    title: "System",
    items: [
      { href: "/admin/settings", label: "Settings", icon: Settings },
      { href: "/admin/settings/account", label: "Account", icon: UserRound },
    ],
  },
];

export interface AdminShellUser {
  email: string;
  fullName: string | null;
}

export interface AdminShellCounts {
  newRentalEnquiries: number;
  newPropertyEnquiries: number;
  newShopEnquiries: number;
  newContactMessages: number;
}

export function AdminShell({
  businessName,
  user,
  signOut,
  counts,
  children,
}: {
  businessName: string;
  user: AdminShellUser;
  signOut: () => Promise<void>;
  counts: AdminShellCounts;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  // A route transition must dismiss the mobile drawer.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setOpen(false), [pathname]);

  const currentPage = useMemo<NavItem | undefined>(() => {
    const flat = NAV_GROUPS.flatMap((group) => group.items);
    return (
      flat.find((item) =>
        item.href === "/admin" ? pathname === "/admin" : pathname === item.href || pathname.startsWith(`${item.href}/`),
      ) ?? flat[0]
    );
  }, [pathname]);

  const totalPending = counts.newRentalEnquiries + counts.newPropertyEnquiries + counts.newShopEnquiries + counts.newContactMessages;

  const nav = (
    <nav className="flex flex-col gap-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.title} className="space-y-1.5">
          <p className="px-3 text-[11px] font-medium uppercase tracking-[0.22em] text-black/30">{group.title}</p>
          {group.items.map((item) => {
            const active =
              item.href === "/admin" ? pathname === "/admin" : pathname === item.href || pathname.startsWith(`${item.href}/`);
            const badgeValue =
              item.href === "/admin/enquiries" && totalPending > 0 ? totalPending : undefined;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-black/65 hover:bg-black/5 hover:text-ink",
                  collapsed && "justify-center px-2",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.5} />
                {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                {!collapsed && badgeValue && (
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                    {badgeValue > 99 ? "99+" : badgeValue}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen bg-[#f4f2ee]">
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-black/10 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/admin" className="flex items-center gap-2.5">
          <LogoMark />
          <span className="font-display text-sm font-semibold tracking-tight">{businessName}</span>
        </Link>
        <div className="flex items-center gap-2">
          <button type="button" className="grid h-9 w-9 place-items-center rounded-full hover:bg-black/5" aria-label="Notifications">
            <Bell className="h-4 w-4" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
            className="grid h-9 w-9 place-items-center rounded-full hover:bg-black/5"
          >
            {open ? <X className="h-5 w-5" strokeWidth={1.5} /> : <Menu className="h-5 w-5" strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="sticky top-[57px] z-30 border-b border-black/10 bg-white p-4 lg:hidden">
          {nav}
          <div className="mt-6 border-t border-black/10 pt-4">
            <p className="truncate text-xs text-black/40">{user.fullName || user.email}</p>
            <div className="mt-3 flex gap-2">
              <Link href="/" target="_blank" className="btn-ghost flex-1 justify-center">
                <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
                Site
              </Link>
              <form action={signOut} className="flex-1">
                <button type="submit" className="btn-ghost w-full justify-center">
                  <LogOut className="h-4 w-4" strokeWidth={1.5} />
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="mx-auto flex w-full max-w-[1480px] gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <aside className={cn("hidden shrink-0 lg:block", collapsed ? "w-[88px]" : "w-[258px]")}>
          <div className="sticky top-6 rounded-[22px] border border-black/5 bg-[#fcfbf9] p-3 shadow-[0_10px_35px_rgba(17,24,39,0.04)]">
            <div className={cn("mb-5 flex items-center gap-3 px-2", collapsed && "justify-center") }>
              <Link href="/admin" className="flex items-center gap-2.5 overflow-hidden">
                <LogoMark />
                {!collapsed && <span className="font-display text-sm font-semibold tracking-tight">{businessName}</span>}
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className="mb-4 hidden w-full items-center justify-between rounded-xl border border-black/10 bg-white px-3 py-2 text-left text-[11px] font-medium uppercase tracking-[0.2em] text-black/40 lg:flex"
            >
              <span>{collapsed ? "Expand" : "Collapse"}</span>
              <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", collapsed ? "rotate-180" : "rotate-0")} strokeWidth={1.6} />
            </button>

            <div className="space-y-4">{nav}</div>

            <div className={cn("mt-6 border-t border-black/10 pt-4", collapsed && "px-0") }>
              {!collapsed && (
                <div className="mb-2 flex items-center justify-between rounded-xl bg-slate-900 px-3 py-2 text-white">
                  <div className="min-w-0">
                    <p className="truncate text-[11px] uppercase tracking-[0.18em] text-white/60">Active</p>
                    <p className="truncate text-xs font-medium">{currentPage?.label ?? "Overview"}</p>
                  </div>
                </div>
              )}
              <Link
                href="/"
                target="_blank"
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-black/65 transition-colors hover:bg-black/5 hover:text-ink",
                  collapsed && "justify-center px-2",
                )}
              >
                <ExternalLink className="h-4 w-4" strokeWidth={1.5} />
                {!collapsed && <span>View website</span>}
              </Link>

              <div className={cn("mt-3 flex items-center gap-3 rounded-xl bg-white px-3 py-2.5", collapsed && "justify-center px-2")}>
                <div className="grid h-8 w-8 place-items-center rounded-full bg-slate-900 text-xs font-medium text-white">
                  {user.fullName?.charAt(0)?.toUpperCase() ?? user.email.charAt(0).toUpperCase()}
                </div>
                {!collapsed && (
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium text-black">{user.fullName || user.email}</p>
                    <p className="truncate text-[10px] uppercase tracking-[0.18em] text-black/40">Administrator</p>
                  </div>
                )}
              </div>

              <form action={signOut} className={cn("mt-3", collapsed && "px-0")}>
                <button
                  type="submit"
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-black/65 transition-colors hover:bg-black/5 hover:text-ink",
                    collapsed && "justify-center px-2",
                  )}
                >
                  <LogOut className="h-4 w-4" strokeWidth={1.5} />
                  {!collapsed && <span>Sign out</span>}
                </button>
              </form>
            </div>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <header className="mb-6 flex flex-col gap-4 rounded-[22px] border border-black/5 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-black/40">Penman Empire</p>
              <h1 className="mt-2 font-display text-2xl font-light tracking-tight text-slate-900">
                {currentPage?.label ?? "Overview"}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:justify-end">
              <form action="/admin" className="hidden items-center gap-2 rounded-full border border-black/10 bg-[#f7f6f4] px-3 py-2 sm:flex">
                <Search className="h-4 w-4 text-black/40" strokeWidth={1.6} />
                <input
                  type="search"
                  name="q"
                  placeholder="Search admin"
                  className="w-40 bg-transparent text-sm text-slate-900 placeholder:text-black/35 focus:outline-none"
                />
              </form>

              <button
                type="button"
                className="relative grid h-10 w-10 place-items-center rounded-full border border-black/10 bg-[#f7f6f4] text-slate-700 hover:bg-black/5"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" strokeWidth={1.6} />
                {totalPending > 0 && (
                  <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-amber-500 ring-2 ring-white" />
                )}
              </button>

              <Link href="/admin/vehicles/new" className="btn-primary gap-2 py-2.5 text-sm">
                <Sparkles className="h-4 w-4" strokeWidth={1.5} />
                Add listing
              </Link>
            </div>
          </header>

          {children}
        </main>
      </div>
    </div>
  );
}
