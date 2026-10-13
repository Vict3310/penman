import { cn } from "@/lib/utils";

interface LogoProps {
  name: string;
  className?: string;
  tone?: "dark" | "light";
  showWordmark?: boolean;
}

/**
 * The 3×3 dot cluster motif from design.html, recoloured for Penman Empire
 * (leaf-green corners, ink/white body).
 */
export function LogoMark({ tone = "dark", className }: { tone?: "dark" | "light"; className?: string }) {
  const dots = [
    "bg-leaf",
    tone === "dark" ? "bg-black/70" : "bg-white/70",
    tone === "dark" ? "bg-black/30" : "bg-white/30",
    tone === "dark" ? "bg-black/70" : "bg-white/70",
    tone === "dark" ? "bg-black/30" : "bg-white/30",
    tone === "dark" ? "bg-black/70" : "bg-white/70",
    tone === "dark" ? "bg-black/30" : "bg-white/30",
    tone === "dark" ? "bg-black/70" : "bg-white/70",
    "bg-leaf",
  ];
  return (
    <span aria-hidden className={cn("grid shrink-0 grid-cols-3 gap-[2.5px]", className)}>
      {dots.map((dot, i) => (
        <span key={i} className={cn("h-1 w-1 rounded-full", dot)} />
      ))}
    </span>
  );
}

export function Logo({ name, className, tone = "dark", showWordmark = true }: LogoProps) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMark tone={tone} />
      {showWordmark && (
        <span
          className={cn(
            "font-display whitespace-nowrap text-sm font-semibold tracking-tight",
            tone === "dark" ? "text-ink" : "text-white",
          )}
        >
          {name}
        </span>
      )}
    </span>
  );
}
