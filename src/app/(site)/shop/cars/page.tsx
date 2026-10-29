import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Search, SlidersHorizontal } from "lucide-react";
import { ResultsSkeleton } from "@/components/catalogue-skeleton";
import { ProductCard } from "@/components/cards";
import { EmptyState, Pagination } from "@/components/ui/misc";
import { DataModeNotice } from "@/components/data-mode-notice";
import { listProducts, type ProductFilters } from "@/lib/queries";
import { isSupabaseConfigured } from "@/lib/env";
import { buildQuery, readNumber, readPage, readSort, readString, type RawSearchParams } from "@/lib/search-params";

export const revalidate = 60;
export const metadata: Metadata = {
  title: "Shop Cars",
  description: "Browse Mercedes-Benz, Dodge, BMW and other premium cars with real vehicle photography.",
  alternates: { canonical: "/shop/cars" },
};

const MAKES = ["Mercedes-Benz", "Dodge", "BMW", "Porsche", "Land Rover", "Audi", "Lexus", "Toyota", "Ford"];
const BODIES = [{ value: "SUV", label: "SUV" }, { value: "sedan", label: "Sedan" }, { value: "coupe", label: "Coupe" }];
const SORTS = ["newest", "price_asc", "price_desc"] as const;
const LISTINGS = ["all", "stock", "models"] as const;
const positive = (value: number | undefined) => value !== undefined && value > 0 ? Math.floor(value) : undefined;

export default async function ShopCarsPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const params = await searchParams;
  const make = readString(params, "make");
  const body = readString(params, "body");
  const filters: ProductFilters = {
    q: readString(params, "q")?.slice(0, 80),
    category: isSupabaseConfigured() ? "cars" : undefined,
    make: make && MAKES.includes(make) ? make : undefined,
    body: body && BODIES.some((item) => item.value === body) ? body : undefined,
    minYear: positive(readNumber(params, "minYear")),
    maxYear: positive(readNumber(params, "maxYear")),
    maxMileage: positive(readNumber(params, "maxMileage")),
    minPrice: positive(readNumber(params, "minPrice")),
    maxPrice: positive(readNumber(params, "maxPrice")),
    listing: readSort(params, "listing", LISTINGS, "all"),
    sort: readSort(params, "sort", SORTS, "newest"),
    page: readPage(params),
    perPage: 12,
  };
  const selectedCount = [filters.q, filters.make, filters.body, filters.minYear, filters.maxYear, filters.maxMileage, filters.minPrice, filters.maxPrice, filters.listing !== "all" ? filters.listing : null].filter(Boolean).length;

  return (
    <>
      <section className="mx-3 mt-3 rounded-[2rem] bg-[#17231d] sm:mx-5 py-10 text-white sm:py-14">
        <div className="shell"><nav aria-label="Breadcrumb" className="mb-5 flex gap-2 text-xs text-white/55"><Link href="/shop" className="hover:text-white">Home</Link><span>/</span><span className="text-white">Shop cars</span></nav><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d9bb8a]">The catalogue</p><h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">Find your next car.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">Browse performance, luxury and everyday favourites. Open a car to see its gallery and ask Penman about the exact vehicle you want.</p></div>
      </section>
      <section className="shell py-8 sm:py-12">
        {!isSupabaseConfigured() && <div className="mb-6"><DataModeNotice context="The catalogue is read from your database." /></div>}
        <form action="/shop/cars" className="rounded-[1.5rem] border border-black/10 bg-white p-4 shadow-[0_8px_30px_rgba(18,32,26,0.05)] sm:p-5" role="search">
          <div className="grid gap-3 md:grid-cols-[1fr_200px_180px_auto] md:items-end">
            <label><span className="store-filter-label">Search by model</span><input type="search" name="q" defaultValue={filters.q ?? ""} placeholder="C300, GLE, Hellcat…" className="store-filter-input" /></label>
            <label><span className="store-filter-label">Make</span><select name="make" defaultValue={filters.make ?? ""} className="store-filter-input"><option value="">All makes</option>{MAKES.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span className="store-filter-label">Body style</span><select name="body" defaultValue={filters.body ?? ""} className="store-filter-input"><option value="">All styles</option>{BODIES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <button type="submit" className="flex h-11 items-center justify-center gap-2 rounded-xl bg-[#17231d] px-6 text-sm font-semibold text-white hover:bg-[#2b4734]"><Search className="h-4 w-4" /> Show cars</button>
          </div>
          <details className="mt-4 border-t border-black/10 pt-4" open={selectedCount > 3 ? true : undefined}><summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold text-[#17231d]"><SlidersHorizontal className="h-4 w-4" /> More filters {selectedCount > 0 && <span className="text-xs font-normal text-black/45">({selectedCount} selected)</span>}</summary><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label><span className="store-filter-label">From year</span><input type="number" name="minYear" min="1950" max="2100" defaultValue={filters.minYear} placeholder="Any year" className="store-filter-input" /></label>
            <label><span className="store-filter-label">To year</span><input type="number" name="maxYear" min="1950" max="2100" defaultValue={filters.maxYear} placeholder="Any year" className="store-filter-input" /></label>
            <label><span className="store-filter-label">Maximum mileage (km)</span><input type="number" name="maxMileage" min="0" step="1000" defaultValue={filters.maxMileage} placeholder="Any mileage" className="store-filter-input" /></label>
            <label><span className="store-filter-label">Maximum price (₦)</span><input type="number" name="maxPrice" min="0" step="100000" defaultValue={filters.maxPrice} placeholder="Any price" className="store-filter-input" /></label>
            <label><span className="store-filter-label">Minimum price (₦)</span><input type="number" name="minPrice" min="0" step="100000" defaultValue={filters.minPrice} placeholder="Any price" className="store-filter-input" /></label>
            <label><span className="store-filter-label">Listing type</span><select name="listing" defaultValue={filters.listing} className="store-filter-input"><option value="all">All cars</option><option value="stock">Confirmed listings</option><option value="models">Model references</option></select></label>
            <label><span className="store-filter-label">Sort by</span><select name="sort" defaultValue={filters.sort} className="store-filter-input"><option value="newest">Featured first</option><option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option></select></label>
            <div className="flex items-end gap-3"><button type="submit" className="h-11 flex-1 rounded-xl border border-[#17231d] px-4 text-sm font-semibold text-[#17231d] hover:bg-black/5">Apply filters</button><Link href="/shop/cars" className="py-3 text-xs text-black/55 underline hover:text-black">Clear</Link></div>
          </div></details>
        </form>
        <Suspense fallback={<ResultsSkeleton columns={3} />}><ProductResults filters={filters} params={params} /></Suspense>
      </section>
      <section className="border-t border-black/10 bg-[#f1eee7] py-12"><div className="shell flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><p className="store-eyebrow">Need a specific car?</p><h2 className="mt-2 font-display text-2xl font-semibold">Tell us what to source.</h2></div><Link href="/shop/contact" className="store-text-link">Speak to Penman <ArrowRight className="h-4 w-4" /></Link></div></section>
    </>
  );
}

async function ProductResults({ filters, params }: { filters: ProductFilters; params: RawSearchParams }) {
  const result = await listProducts(filters);
  if (!result.items.length) return <div className="mt-8"><EmptyState title="No cars match those filters" description="Try a broader search or tell Penman what you are looking for." action={{ href: "/shop/contact", label: "Ask Penman" }} /></div>;
  return <div className="mt-7"><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-black/60"><strong className="text-[#17231d]">{result.total}</strong> car{result.total === 1 ? "" : "s"} found</p><p className="text-xs text-black/45">Browse details · Save favourites · Enquire directly</p></div><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{result.items.map((product) => <ProductCard key={product.id} product={product} />)}</div><Pagination page={result.page} pageCount={result.pageCount} buildHref={(page) => `/shop/cars${buildQuery(params, { page: String(page) })}`} /></div>;
}
