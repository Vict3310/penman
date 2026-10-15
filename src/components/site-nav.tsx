"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";

const SECTION_LINKS: Record<string, { href: string; label: string }[]> = {
  "/autos": [
    { href: "/autos", label: "Home" },
    { href: "/autos/cars", label: "Cars" },
    { href: "/autos/about", label: "About" },
    { href: "/autos/faq", label: "FAQ" },
    { href: "/autos/contact", label: "Contact" },
  ],
  "/rental": [
    { href: "/rental", label: "Home" },
    { href: "/rental/cars", label: "Cars" },
    { href: "/rental/how-it-works", label: "How it works" },
    { href: "/rental/faq", label: "FAQ" },
    { href: "/rental/contact", label: "Contact" },
  ],
  "/shop": [
    { href: "/shop", label: "Home" },
    { href: "/shop/cars", label: "Cars" },
    { href: "/shop/buying-guide", label: "Buying guide" },
    { href: "/shop/faq", label: "FAQ" },
    { href: "/shop/contact", label: "Contact" },
  ],
  "/real-estate": [
    { href: "/real-estate", label: "Home" },
    { href: "/real-estate/properties", label: "Properties" },
    { href: "/real-estate/services", label: "Services" },
    { href: "/real-estate/faq", label: "FAQ" },
    { href: "/real-estate/contact", label: "Contact" },
  ],
};

interface SiteNavProps {
  businessName: string;
  ctaLabel?: string;
  ctaHref?: string;
}

export function SiteNav({ businessName, ctaLabel = "Contact", ctaHref }: SiteNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const sectionHome = useMemo(() => {
    if (pathname === "/") return "/autos";

    const matched = Object.entries(SECTION_LINKS).find(
      ([key]) => pathname === key || pathname.startsWith(`${key}/`),
    ) as [string, Array<{ href: string; label: string }>] | undefined;

    return matched ? matched[0] : "/autos";
  }, [pathname]);

  const sectionLinks = useMemo<Array<{ href: string; label: string }>>(() => {
    const matched = Object.entries(SECTION_LINKS).find(
      ([key]) => pathname === key || pathname.startsWith(`${key}/`),
    ) as [string, Array<{ href: string; label: string }>] | undefined;

    return matched ? matched[1] : (SECTION_LINKS["/autos"] ?? []);
  }, [pathname]);

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
    <nav className="fixed left-1/2 top-4 z-50 w-[calc(100%-1rem)] max-w-[480px] -translate-x-1/2 sm:top-7 lg:w-auto lg:max-w-none">
      <div
        className={cn(
          "relative flex items-center gap-2 rounded-full border border-black/10 bg-white/90 px-2 py-1.5 shadow-xl backdrop-blur-md transition-all duration-300",
          scrolled ? "shadow-black/10" : "shadow-black/5",
        )}
      >
        <Link href={sectionHome} className="flex items-center gap-2.5 px-2 py-1.5 sm:px-3" aria-label={`${businessName} home`}>
          <Logo name={businessName} />
        </Link>

        <div className="hidden items-center gap-1 text-sm text-black/60 lg:flex">
          {sectionLinks.map((link) => {
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

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="ml-auto grid h-10 w-10 place-items-center rounded-full text-ink transition-colors hover:bg-black/5 lg:hidden"
        >
          {open ? <X className="h-5 w-5" strokeWidth={1.5} /> : <Menu className="h-5 w-5" strokeWidth={1.5} />}
        </button>
      </div>

      {open && (
        <div
          id="mobile-menu"
          className="absolute right-0 top-[calc(100%+10px)] z-20 w-[min(280px,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-black/10 bg-white/95 p-3 shadow-2xl shadow-black/15 backdrop-blur-md lg:hidden"
        >
          <div className="space-y-1.5">
            {sectionLinks.map((link) => {
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
        </div>
      )}
    </nav>
  );
}
