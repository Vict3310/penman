import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  emphasis,
  description,
  action,
  tone = "light",
  className,
}: {
  eyebrow?: string;
  title: string;
  emphasis?: string;
  description?: string;
  action?: { href: string; label: string };
  tone?: "light" | "dark";
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <div className={cn("flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="max-w-2xl">
        {eyebrow && (
          <p className={cn("eyebrow mb-5", dark && "text-leaf")}>{eyebrow}</p>
        )}
        <h2
          data-reveal-words
          className={cn(
            "font-display text-4xl font-light leading-[1.05] tracking-tighter sm:text-5xl",
            dark ? "text-white" : "text-ink",
          )}
          data-reveal
        >
          {title}
          {emphasis && (
            <>
              {" "}
              <em className="font-serif font-normal italic">{emphasis}</em>
            </>
          )}
        </h2>
        {description && (
          <p
            data-reveal
            className={cn("mt-5 max-w-xl text-base", dark ? "text-white/60" : "text-black/60")}
            style={{ transitionDelay: "120ms" }}
          >
            {description}
          </p>
        )}
      </div>
      {action && (
        <Link
          href={action.href}
          data-reveal
          className={cn(
            "group inline-flex shrink-0 items-center gap-2 border-b pb-1 text-sm transition-colors duration-300",
            dark
              ? "border-white/30 text-white/70 hover:border-white hover:text-white"
              : "border-black/20 text-black/60 hover:border-ink hover:text-ink",
          )}
        >
          {action.label}
          <ArrowUpRight
            className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            strokeWidth={1.5}
          />
        </Link>
      )}
    </div>
  );
}
