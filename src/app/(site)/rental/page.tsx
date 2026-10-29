import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CalendarDays, CarFront, Search, ShieldCheck } from "lucide-react";
import { Figure, VehicleCard } from "@/components/cards";
import { DataModeNotice } from "@/components/data-mode-notice";
import { MotionWords } from "@/components/motion-words";
import { getFeaturedVehicles, getVehicleCategories, listVehicles } from "@/lib/queries";
import { isSupabaseConfigured } from "@/lib/env";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Car Rentals",
  description: "Explore Penman rental vehicle styles and send your dates to confirm availability.",
  alternates: { canonical: "/rental" },
};

export default async function RentalHomePage() {
  const [featured, catalogue, categories] = await Promise.all([
    getFeaturedVehicles(6), listVehicles({ perPage: 6 }), getVehicleCategories(),
  ]);
  const vehicles = [...new Map([...featured, ...catalogue.items].map((item) => [item.id, item])).values()].slice(0, 6);
  const hero = vehicles[0];
  return <>
    <section className="relative isolate mx-3 mt-3 min-h-[500px] overflow-hidden rounded-[2rem] bg-[#17231d] text-white shadow-[0_20px_60px_rgba(18,32,26,0.18)] sm:mx-5 sm:min-h-[570px] sm:rounded-[2.5rem]">
      {hero && <div data-panel-img className="absolute inset-0"><Figure images={hero.images} alt={hero.name} className="absolute inset-0 h-full w-full opacity-65" sizes="100vw" priority hoverZoom={false} /></div>}
      <div className="absolute inset-0 bg-gradient-to-r from-[#101913]/95 via-[#101913]/75 to-[#101913]/10" />
      <div className="shell relative z-10 flex min-h-[500px] flex-col justify-center py-14 sm:min-h-[570px]"><p data-reveal className="mb-5 text-xs font-semibold uppercase tracking-[0.3em] text-[#d9bb8a]">Penman Rentals</p><h1 data-reveal-words className="max-w-3xl font-display text-5xl font-semibold leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl"><MotionWords text="A better drive for" /> <span className="font-serif font-normal italic text-[#d9bb8a]"><MotionWords text="every plan." /></span></h1><p data-reveal className="mt-6 max-w-xl text-base leading-7 text-white/75 sm:text-lg" style={{ transitionDelay: "280ms" }}>Explore rental cars for business, travel and special occasions. Send your dates and get a direct answer from the team.</p><div data-reveal className="mt-9 flex flex-wrap gap-3" style={{ transitionDelay: "420ms" }}><Link href="/rental/cars" className="inline-flex items-center gap-2 rounded-full bg-[#d9bb8a] px-6 py-3.5 text-sm font-semibold text-[#17231d] hover:bg-white">Browse rental cars <ArrowRight className="h-4 w-4" /></Link><Link href="/rental/contact" className="rounded-full border border-white/45 px-6 py-3.5 text-sm font-semibold text-white hover:bg-white/10">Ask about a rental</Link></div>{hero && <Link data-reveal href={`/rental/${hero.slug}`} className="absolute bottom-5 right-5 hidden max-w-xs rounded-2xl border-l-2 border-[#d9bb8a] bg-black/35 px-4 py-2 text-sm backdrop-blur sm:block" style={{ transitionDelay: "560ms" }}><span className="block text-[10px] uppercase tracking-[0.2em] text-white/60">Featured model</span><span className="font-semibold">{hero.name}</span></Link>}</div>
    </section>
    <section className="shell relative z-10 py-7 lg:-mt-10 lg:pb-14"><form data-reveal action="/rental/cars" className="grid gap-3 rounded-[1.5rem] border border-black/10 bg-white p-4 shadow-[0_15px_40px_rgba(0,0,0,0.09)] md:grid-cols-[1fr_220px_auto] md:items-end md:p-5" role="search" style={{ transitionDelay: "180ms" }}><label><span className="store-filter-label">Find a rental car</span><input name="q" type="search" placeholder="Search vehicle name…" className="store-filter-input" /></label><label><span className="store-filter-label">Vehicle type</span><select name="category" className="store-filter-input"><option value="">All types</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label><button type="submit" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#17231d] px-6 text-sm font-semibold text-white hover:bg-[#2b4734]"><Search className="h-4 w-4" /> Find rentals</button></form></section>
    {!isSupabaseConfigured() && <div className="shell pb-8"><DataModeNotice context="Rental cars are read from your database." /></div>}
    <section className="shell pb-16 pt-4 sm:pb-20"><div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p data-reveal className="store-eyebrow">Explore the fleet</p><h2 data-reveal-words className="store-heading mt-2"><MotionWords text="Find the right ride" /></h2></div><Link data-reveal href="/rental/cars" className="store-text-link">All rental cars <ArrowRight className="h-4 w-4" /></Link></div>{vehicles.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{vehicles.map((vehicle, index) => <div key={vehicle.id} data-reveal style={{ transitionDelay: `${Math.min(index, 5) * 85}ms` }}><VehicleCard vehicle={vehicle} /></div>)}</div> : <div className="rounded-2xl border border-black/10 bg-white p-8 text-sm text-black/55">Rental vehicles will appear here when published.</div>}</section>
    <section className="bg-[#f1eee7] py-14"><div className="shell grid gap-6 md:grid-cols-3"><div data-reveal className="rounded-2xl bg-white p-6"><CarFront className="h-6 w-6 text-[#a48351]" /><h3 className="mt-4 font-display text-lg font-semibold">Choose your style</h3><p className="mt-2 text-sm leading-6 text-black/55">Browse a vehicle that suits your route and passengers.</p></div><div data-reveal style={{ transitionDelay: "100ms" }} className="rounded-2xl bg-white p-6"><CalendarDays className="h-6 w-6 text-[#a48351]" /><h3 className="mt-4 font-display text-lg font-semibold">Share your dates</h3><p className="mt-2 text-sm leading-6 text-black/55">Tell us your pickup and return dates with your enquiry.</p></div><div data-reveal style={{ transitionDelay: "200ms" }} className="rounded-2xl bg-white p-6"><ShieldCheck className="h-6 w-6 text-[#a48351]" /><h3 className="mt-4 font-display text-lg font-semibold">Get confirmation</h3><p className="mt-2 text-sm leading-6 text-black/55">The team confirms a specific vehicle, rate and terms with you.</p></div></div></section>
    <section className="bg-[#17231d] py-14 text-white"><div className="shell flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between"><div><p data-reveal className="text-xs uppercase tracking-[0.2em] text-[#d9bb8a]">Planning a trip?</p><h2 data-reveal-words className="mt-2 font-display text-3xl font-semibold"><MotionWords text="Let’s get you moving." /></h2></div><div data-reveal style={{ transitionDelay: "180ms" }}><Link href="/rental/contact" className="inline-flex items-center gap-2 rounded-full bg-[#d9bb8a] px-6 py-3 text-sm font-semibold text-[#17231d]">Contact rentals <ArrowRight className="h-4 w-4" /></Link></div></div></section>
  </>;
}
