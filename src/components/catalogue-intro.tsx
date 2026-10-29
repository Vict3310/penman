import Link from "next/link";

export function CatalogueIntro({ eyebrow, title, description, parentHref, parentLabel }: { eyebrow: string; title: string; description: string; parentHref: string; parentLabel: string }) {
  return <header className="mx-3 mt-3 rounded-[2rem] bg-[#17231d] py-10 text-white sm:mx-5 sm:py-14"><div className="shell"><nav aria-label="Breadcrumb" className="mb-5 flex gap-2 text-xs text-white/55"><Link href={parentHref} className="hover:text-white">{parentLabel}</Link><span>/</span><span className="text-white">{eyebrow}</span></nav><p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#d9bb8a]">{eyebrow}</p><h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">{description}</p></div></header>;
}
