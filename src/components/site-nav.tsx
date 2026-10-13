"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/rental", label: "Rental" },
  { href: "/shop", label: "Cars for Sale" },
  { href: "/real-estate", label: "Real Estate" },
  { href: "/about", label: "About" },
] as const;

interface SiteNavProps {
  businessName: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export function SiteNav({ businessName, ctaLabel = "Contact", ctaHref = "/contact" }: SiteNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <nav className="fixed left-1/2 top-4 z-50 -translate-x-1/2 sm:top-7">
      <div
        className={cn(
          "flex items-center gap-1 rounded-full border border-black/10 bg-white/90 py-1.5 pl-4 pr-1.5 shadow-xl backdrop-blur-md transition-shadow duration-300",
          scrolled ? "shadow-black/10" : "shadow-black/5",
        )}
      >
        <Link href="/" className="flex items-center gap-2.5 pr-3 sm:pr-4" aria-label={`${businessName} home`}>
          <Logo name={businessName} />
        </Link>

        <div className="hidden items-center gap-1 text-sm text-black/60 lg:flex">
          {LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-3 py-1.5 transition-colors duration-300 hover:bg-black/5 hover:text-black",
                  active && "bg-black/5 text-black",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <Link
          href={ctaHref}
          className="ml-1 whitespace-nowrap rounded-full bg-forest px-4 py-2 text-sm font-medium text-white shadow-lg shadow-forest/30 transition-all duration-300 hover:bg-forest-light active:scale-95 sm:ml-2 sm:px-5"
        >
          {ctaLabel}
        </Link>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="ml-0.5 grid h-9 w-9 place-items-center rounded-full text-ink transition-colors hover:bg-black/5 lg:hidden"
        >
          {open ? <X className="h-5 w-5" strokeWidth={1.5} /> : <Menu className="h-5 w-5" strokeWidth={1.5} />}
        </button>
      </div>

      {open && (
        <div
          id="mobile-menu"
          className="mt-2 w-[calc(100vw-2rem)] max-w-sm overflow-hidden rounded-3xl border border-black/10 bg-white/95 p-3 shadow-2xl shadow-black/10 backdrop-blur-md lg:hidden"
        >
          {[...LINKS, { href: "/contact", label: "Contact" }].map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "block rounded-2xl px-4 py-3 text-base transition-colors",
                  active ? "bg-sage text-forest" : "text-ink hover:bg-black/5",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      )}
    </nav>
  );
}
