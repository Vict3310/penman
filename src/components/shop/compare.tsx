"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Scale, X } from "lucide-react";
import { toast } from "sonner";
import type { Product } from "@/lib/types";
import { SafeImage } from "@/components/ui/safe-image";
import { isVideoMedia } from "@/lib/types";
import { formatCurrency, formatMileage } from "@/lib/utils";

const KEY = "penman-compare-cars-v1";
const EVENT = "penman-compare-change";

type CompareCar = {
  id: string;
  slug: string;
  name: string;
  image?: string;
  make?: string | null;
  body?: string | null;
  year?: number | null;
  mileage?: number | null;
  colour?: string | null;
  region?: string | null;
  condition?: string | null;
  price?: number | null;
  currency: string;
  reference: boolean;
};

function readCars(): CompareCar[] {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(value) ? value.filter((item) => item && typeof item.slug === "string").slice(0, 3) : [];
  } catch { return []; }
}
function writeCars(cars: CompareCar[]) {
  localStorage.setItem(KEY, JSON.stringify(cars));
  window.dispatchEvent(new Event(EVENT));
}
function snapshot(product: Product): CompareCar {
  const specs = product.specs ?? {};
  return {
    id: product.id, slug: product.slug, name: product.name,
    image: product.images?.find((image) => !isVideoMedia(image))?.url,
    make: specs.make, body: specs.body_style, year: specs.year,
    mileage: product.is_reference ? null : specs.mileage_km, colour: specs.colour, region: specs.region,
    condition: specs.condition_label, price: product.is_reference ? null : product.price,
    currency: product.currency, reference: Boolean(product.is_reference),
  };
}

export function CompareButton({ product, large = false }: { product: Product; large?: boolean }) {
  const [selected, setSelected] = useState(false);
  useEffect(() => {
    const sync = () => setSelected(readCars().some((car) => car.id === product.id));
    sync(); window.addEventListener(EVENT, sync); window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener("storage", sync); };
  }, [product.id]);
  const toggle = () => {
    const cars = readCars();
    if (cars.some((car) => car.id === product.id)) writeCars(cars.filter((car) => car.id !== product.id));
    else if (cars.length >= 3) toast.info("Compare up to three cars at a time.");
    else writeCars([...cars, snapshot(product)]);
  };
  return <button type="button" onClick={toggle} aria-pressed={selected} aria-label={`${selected ? "Remove" : "Add"} ${product.name} ${selected ? "from" : "to"} comparison`} className={large ? "inline-flex items-center justify-center gap-2 rounded-full border border-black/20 px-4 py-3 text-sm font-semibold text-[#17231d] hover:bg-black/5" : "inline-flex items-center gap-1.5 rounded-full bg-white/95 px-2.5 py-1.5 text-xs font-semibold text-[#17231d] shadow-sm hover:bg-white"}><Scale className="h-3.5 w-3.5" />{selected ? "Added" : "Compare"}</button>;
}

export function CompareBar() {
  const [cars, setCars] = useState<CompareCar[]>([]);
  useEffect(() => {
    const sync = () => setCars(readCars());
    sync(); window.addEventListener(EVENT, sync); window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);
  if (!cars.length) return null;
  return <aside aria-label="Car comparison" className="fixed inset-x-0 bottom-0 z-40 border-t border-[#a48351]/40 bg-[#17231d] p-3 text-white shadow-2xl"><div className="shell flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><Scale className="h-5 w-5 text-[#d9bb8a]" /><p className="text-sm font-semibold">Compare cars <span className="font-normal text-white/60">({cars.length}/3)</span></p><span className="hidden text-xs text-white/60 sm:inline">{cars.map((car) => car.name).join(" · ")}</span></div><div className="flex items-center gap-3"><button type="button" onClick={() => writeCars([])} className="text-xs text-white/60 underline hover:text-white">Clear</button><Link href="/shop/compare" className="inline-flex items-center gap-2 bg-[#d9bb8a] px-4 py-2 text-xs font-semibold text-[#17231d]">Compare now <ArrowRight className="h-3.5 w-3.5" /></Link></div></div></aside>;
}

export function ComparePage() {
  const [cars, setCars] = useState<CompareCar[]>([]);
  useEffect(() => {
    const sync = () => setCars(readCars());
    sync(); window.addEventListener(EVENT, sync); window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener("storage", sync); };
  }, []);
  const rows: { label: string; value: (car: CompareCar) => string }[] = [
    { label: "Price", value: (car) => car.price ? formatCurrency(car.price, car.currency) : "Ask for price" },
    { label: "Year", value: (car) => car.year ? String(car.year) : "—" },
    { label: "Mileage", value: (car) => formatMileage(car.mileage) || "—" },
    { label: "Make", value: (car) => car.make || "—" },
    { label: "Body style", value: (car) => car.body || "—" },
    { label: "Colour", value: (car) => car.colour || "—" },
    { label: "Condition", value: (car) => car.condition || "—" },
    { label: "Location", value: (car) => car.region || "—" },
    { label: "Listing", value: (car) => car.reference ? "Model reference" : "Vehicle listing" },
  ];
  return <div className="shell py-12 sm:py-16"><p className="store-eyebrow">Your shortlist</p><h1 className="store-heading mt-2">Compare cars</h1><p className="mt-3 text-sm text-black/55">See known details side by side, then open a car to ask about availability.</p>{cars.length ? <div className="mt-8 overflow-x-auto border border-black/10 bg-white"><table className="w-full min-w-[680px] border-collapse text-left"><thead><tr><th className="w-36 p-4 text-xs uppercase tracking-widest text-black/45">Details</th>{cars.map((car) => <th key={car.id} className="w-[30%] border-l border-black/10 p-4 align-top"><div className="flex items-start justify-between gap-2"><Link href={`/shop/${car.slug}`} className="font-display text-lg font-semibold hover:underline">{car.name}</Link><button type="button" aria-label={`Remove ${car.name}`} onClick={() => writeCars(cars.filter((item) => item.id !== car.id))}><X className="h-4 w-4 text-black/40" /></button></div>{car.image && <div className="relative mt-3 aspect-[4/3] w-full overflow-hidden rounded-xl"><SafeImage src={car.image} alt={car.name} sizes="30vw" className="object-cover" /></div>}<Link href={`/shop/${car.slug}`} className="mt-3 inline-block text-xs font-semibold text-[#9b7847] underline">View car</Link></th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.label} className="border-t border-black/10"><th scope="row" className="p-4 text-xs font-semibold uppercase tracking-wide text-black/45">{row.label}</th>{cars.map((car) => <td key={car.id} className="border-l border-black/10 p-4 text-sm text-[#17231d]">{row.value(car)}</td>)}</tr>)}</tbody></table></div> : <div className="mt-8 border border-black/10 bg-white p-8 text-sm text-black/55">No cars selected yet. <Link href="/shop/cars" className="font-semibold text-[#17231d] underline">Browse cars</Link> and use Compare on up to three listings.</div>}</div>;
}
