import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CarFront, Search, ShieldCheck, Sparkles } from "lucide-react";
import { Figure, ProductCard } from "@/components/cards";
import { DataModeNotice } from "@/components/data-mode-notice";
import { getFeaturedProducts, listProducts } from "@/lib/queries";
import { isSupabaseConfigured } from "@/lib/env";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Premium Cars",
  description: "Explore Mercedes-Benz, Dodge, AMG and other standout vehicle models with real photography at Penman Autos.",
  alternates: { canonical: "/shop" },
};

const collections = [
  { label: "Mercedes-Benz", detail: "C-Class · GLE · GLC · AMG", href: "/shop/cars?make=Mercedes-Benz" },
  { label: "Dodge", detail: "Challenger · Charger · Hellcat", href: "/shop/cars?make=Dodge" },
  { label: "Performance", detail: "AMG · M · SRT", href: "/shop/cars?q=AMG" },
  { label: "SUVs", detail: "Premium space, road presence", href: "/shop/cars?body=SUV" },
];

export default async function ShopHomePage() {
  const [featured, catalogue] = await Promise.all([
    getFeaturedProducts(6),
    listProducts({ category: "cars", perPage: 6 }),
  ]);
  const products = [...new Map([...featured, ...catalogue.items].map((item) => [item.id, item])).values()].slice(0, 6);
  const hero = products[0];

  return (
    <>
      <section className="relative isolate mx-3 mt-3 min-h-[550px] overflow-hidden rounded-[2rem] bg-[#17231d] shadow-[0_20px_60px_rgba(18,32,26,0.18)] sm:mx-5 sm:rounded-[2.5rem] text-white sm:min-h-[620px]">
        {hero && <Figure images={hero.images} alt={hero.name} className="absolute inset-0 h-full w-full opacity-70" sizes="100vw" priority hoverZoom={false} />}
        <div className="absolute inset-0 bg-gradient-to-r from-[#101913]/95 via-[#101913]/75 to-[#101913]/5" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#101913]/65 via-transparent to-transparent" />
        <div className="shell relative z-10 flex min-h-[550px] flex-col justify-center py-16 sm:min-h-[620px]">
          <p className="mb-5 text-xs font-semibold uppercase tracking-[0.3em] text-[#d9bb8a]">Penman Autos</p>
          <h1 className="max-w-3xl font-display text-5xl font-semibold leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl">Find the car that <span className="font-serif font-normal italic text-[#d9bb8a]">moves you.</span></h1>
          <p className="mt-6 max-w-xl text-base leading-7 text-white/75 sm:text-lg">Explore standout Mercedes-Benz, Dodge and performance models. See the details, save your favourites and enquire directly.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/shop/cars" className="inline-flex items-center gap-2 rounded-full bg-[#d9bb8a] px-6 py-3.5 text-sm font-semibold text-[#17231d] transition hover:bg-white">Explore the cars <ArrowRight className="h-4 w-4" /></Link>
            <Link href="/shop/contact" className="inline-flex items-center gap-2 rounded-full border border-white/45 px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10">Speak to Penman</Link>
          </div>
          {hero && <Link href={`/shop/${hero.slug}`} className="absolute bottom-5 right-6 hidden max-w-xs rounded-2xl border-l-2 border-[#d9bb8a] bg-black/35 px-4 py-2 text-sm backdrop-blur sm:block"><span className="block text-[10px] uppercase tracking-[0.2em] text-white/60">In focus</span><span className="font-semibold">{hero.name}</span><span className="block text-xs text-white/60">{hero.is_reference ? "Model reference · Enquire to source" : "View details"}</span></Link>}
        </div>
      </section>

      <section className="relative z-10 shell -mt-1 py-7 lg:-mt-10 lg:pb-14">
        <form action="/shop/cars" className="grid gap-3 rounded-[1.5rem] border border-black/10 bg-white p-4 shadow-[0_15px_40px_rgba(0,0,0,0.09)] md:grid-cols-[1fr_190px_160px_auto] md:items-end md:p-5" role="search">
          <label className="block"><span className="store-filter-label">Search cars</span><input name="q" type="search" placeholder="C300, GLE, Hellcat…" className="store-filter-input" /></label>
          <label className="block"><span className="store-filter-label">Make</span><select name="make" className="store-filter-input"><option value="">All makes</option><option>Mercedes-Benz</option><option>Dodge</option><option>BMW</option><option>Porsche</option></select></label>
          <label className="block"><span className="store-filter-label">Body style</span><select name="body" className="store-filter-input"><option value="">All styles</option><option>SUV</option><option>Sedan</option><option>Coupe</option></select></label>
          <button type="submit" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#17231d] px-6 text-sm font-semibold text-white hover:bg-[#2b4734]"><Search className="h-4 w-4" /> Find cars</button>
        </form>
      </section>

      {!isSupabaseConfigured() && <div className="shell pb-8"><DataModeNotice context="The catalogue is read from your database." /></div>}

      <section className="shell pb-16 pt-5 sm:pb-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="store-eyebrow">Explore by interest</p><h2 className="store-heading mt-2">The cars you came for</h2></div><Link href="/shop/cars" className="store-text-link">View all cars <ArrowRight className="h-4 w-4" /></Link></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{collections.map((item) => <Link key={item.label} href={item.href} className="group flex min-h-32 flex-col justify-between rounded-2xl border border-black/10 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-[#a48351] hover:shadow-lg"><div className="flex justify-between"><h3 className="font-display text-xl font-semibold text-[#17231d]">{item.label}</h3><ArrowRight className="h-4 w-4 text-[#a48351] transition group-hover:translate-x-1" /></div><p className="text-sm text-black/50">{item.detail}</p></Link>)}</div>
      </section>

      <section className="border-y border-black/10 bg-[#f1eee7] py-16 sm:py-20"><div className="shell"><div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><p className="store-eyebrow">Shop the collection</p><h2 className="store-heading mt-2">Featured cars</h2></div><Link href="/shop/cars" className="store-text-link">Browse all <ArrowRight className="h-4 w-4" /></Link></div>{products.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <p className="rounded-2xl border border-black/10 bg-white p-8 text-sm text-black/60">Cars will appear here when published in the catalogue.</p>}</div></section>

      <section className="shell grid gap-8 py-16 md:grid-cols-3 sm:py-20"><div className="flex gap-4"><CarFront className="h-6 w-6 shrink-0 text-[#a48351]" /><div><h3 className="font-display text-lg font-semibold">Performance led selection</h3><p className="mt-2 text-sm leading-6 text-black/55">Browse the models that match your style, from refined saloons to commanding SUVs.</p></div></div><div className="flex gap-4"><ShieldCheck className="h-6 w-6 shrink-0 text-[#a48351]" /><div><h3 className="font-display text-lg font-semibold">Clear listing details</h3><p className="mt-2 text-sm leading-6 text-black/55">Each page shows what is known and gives you a direct route to confirm availability.</p></div></div><div className="flex gap-4"><Sparkles className="h-6 w-6 shrink-0 text-[#a48351]" /><div><h3 className="font-display text-lg font-semibold">Personal sourcing</h3><p className="mt-2 text-sm leading-6 text-black/55">Found a model you love? Tell Penman your preferred year, specification and budget.</p></div></div></section>
      <section className="bg-[#17231d] py-14 text-white"><div className="shell flex flex-col gap-6 md:flex-row md:items-center md:justify-between"><div><p className="text-xs uppercase tracking-[0.2em] text-[#d9bb8a]">Ready to move?</p><h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">Let’s find your next car.</h2></div><Link href="/shop/contact" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#d9bb8a] px-6 py-3 text-sm font-semibold text-[#17231d]">Contact Penman <ArrowRight className="h-4 w-4" /></Link></div></section>
    </>
  );
}
