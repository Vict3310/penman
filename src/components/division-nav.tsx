import Link from "next/link";
import { cn } from "@/lib/utils";

export function DivisionNav({
  items,
  className,
}: {
  items: { href: string; label: string }[];
  className?: string;
}) {
  return (
    <nav aria-label="Division navigation" className={cn("shell pt-28 sm:pt-32", className)}>
      <div className="flex flex-wrap items-center gap-2 rounded-full border border-black/10 bg-white/80 p-2 shadow-sm backdrop-blur-sm">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-full px-4 py-2 text-sm text-black/60 transition-colors hover:bg-black/5 hover:text-black"
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
