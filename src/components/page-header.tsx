import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  emphasis,
  description,
  className,
}: {
  eyebrow: string;
  title: string;
  emphasis?: string;
  description?: string;
  className?: string;
}) {
  return (
    <header className={cn("relative overflow-hidden pb-14 pt-40 sm:pt-44", className)}>
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -left-1/4 top-0 h-[50vh] w-[60vw] rounded-full bg-sage/70 blur-[100px]" />
      </div>
      <div className="shell relative">
        <p className="eyebrow mb-6" data-reveal>
          {eyebrow}
        </p>
        <h1
          data-reveal
          data-reveal-words
          className="max-w-3xl font-display text-4xl font-light leading-[1.02] tracking-tighter sm:text-6xl"
        >
          {title}
          {emphasis && (
            <>
              {" "}
              <em className="font-serif font-normal italic">{emphasis}</em>
            </>
          )}
        </h1>
        {description && (
          <p data-reveal className="mt-6 max-w-2xl text-lg text-black/60" style={{ transitionDelay: "150ms" }}>
            {description}
          </p>
        )}
      </div>
    </header>
  );
}
