"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Heart, Menu, Search, UserRound, X } from "lucide-react";

const SECTION_NAV = {
  shop: {
    home: "/shop", label: "CAR SALES", topLine: "Premium cars · Direct enquiries · Nigeria",
    search: "/shop/cars", searchLabel: "Search cars",
    links: [
      { href: "/shop/cars", label: "Shop all cars" },
      { href: "/shop/cars?make=Mercedes-Benz", label: "Mercedes-Benz" },
      { href: "/shop/cars?make=Dodge", label: "Dodge" },
      { href: "/shop/cars?body=SUV", label: "SUVs" },
      { href: "/rental", label: "Rentals" },
      { href: "/real-estate", label: "Property" },
    ],
  },
  rental: {
    home: "/rental", label: "RENTALS", topLine: "Premium rentals · Plan your journey · Nigeria",
    search: "/rental/cars", searchLabel: "Search rentals",
    links: [
      { href: "/rental/cars", label: "Browse rentals" },
      { href: "/rental/cars?category=Luxury+SUV", label: "Luxury SUVs" },
      { href: "/rental/cars?category=Luxury+sedan", label: "Sedans" },
      { href: "/rental/how-it-works", label: "How it works" },
      { href: "/shop", label: "Shop cars" },
      { href: "/real-estate", label: "Property" },
    ],
  },
  property: {
    home: "/real-estate", label: "REAL ESTATE", topLine: "Homes & property · Explore with Penman · Nigeria",
    search: "/real-estate/properties", searchLabel: "Search properties",
    links: [
      { href: "/real-estate/properties", label: "Explore properties" },
      { href: "/real-estate/properties?property_type=house", label: "Houses" },
      { href: "/real-estate/properties?property_type=apartment", label: "Apartments" },
      { href: "/real-estate/services", label: "Our services" },
      { href: "/shop", label: "Shop cars" },
      { href: "/rental", label: "Rentals" },
    ],
  },
} as const;

function NavContent({ businessName, section }: { businessName: string; section: (typeof SECTION_NAV)[keyof typeof SECTION_NAV] }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-black/10 bg-[#faf9f5]/95 backdrop-blur-xl">
      <div className="border-b border-black/5 bg-[#17231d] px-5 py-1.5 text-center text-[10px] font-semibold uppercase tracking-[0.22em] text-white/75 sm:text-xs">{section.topLine}</div>
      <div className="shell flex min-h-16 items-center gap-5 py-2 lg:min-h-[76px]">
        <Link href={section.home} className="shrink-0 leading-none" aria-label={`${businessName} ${section.label.toLowerCase()} home`}>
          <span className="block font-display text-xl font-black uppercase tracking-[-0.08em] text-[#17231d] sm:text-2xl">PENMAN<span className="text-[#a48351]">.</span></span>
          <span className="mt-1 block text-[9px] font-semibold uppercase tracking-[0.35em] text-black/45">{section.label}</span>
        </Link>
        <nav aria-label="Primary" className="ml-auto hidden items-center gap-1 xl:flex">
          {section.links.map((link) => <Link key={link.href} href={link.href} className="px-3 py-2 text-sm font-medium text-[#253329]/70 transition hover:text-[#17231d]">{link.label}</Link>)}
        </nav>
        <div className="ml-auto flex items-center gap-1 border-l border-black/10 pl-3 xl:ml-0">
          <Link href={section.search} aria-label={section.searchLabel} className="store-nav-icon"><Search className="h-5 w-5" /></Link>
          <Link href="/account/saved" aria-label="Saved listings" className="store-nav-icon"><Heart className="h-5 w-5" /></Link>
          <Link href="/account" aria-label="Account" className="store-nav-icon hidden sm:grid"><UserRound className="h-5 w-5" /></Link>
          <button type="button" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="store-mobile-menu" onClick={() => setOpen((value) => !value)} className="store-nav-icon xl:hidden">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
        </div>
      </div>
      {open && <nav id="store-mobile-menu" aria-label="Mobile" className="shell grid gap-1 border-t border-black/10 bg-[#faf9f5] pb-4 pt-3 xl:hidden">
        {section.links.map((link) => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-medium text-[#253329] hover:bg-black/5">{link.label}</Link>)}
        <Link href="/account" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-medium text-[#253329] hover:bg-black/5">Your account</Link>
      </nav>}
    </header>
  );
}

export function SiteNav({ businessName }: { businessName: string }) {
  const pathname = usePathname();
  const key = pathname.startsWith("/rental") ? "rental" : pathname.startsWith("/real-estate") ? "property" : "shop";
  return <NavContent key={key} businessName={businessName} section={SECTION_NAV[key]} />;
}
