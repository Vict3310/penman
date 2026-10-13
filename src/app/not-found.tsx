import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="max-w-md text-center">
        <p className="eyebrow mb-6">404</p>
        <h1 className="font-display text-4xl font-light tracking-tighter sm:text-5xl">
          We couldn&apos;t find
          <br />
          <em className="font-serif font-normal italic">that page.</em>
        </h1>
        <p className="mt-6 text-base text-black/60">
          The page you were looking for may have been moved, unpublished or never existed.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-5">
          <Link href="/" className="btn-primary">
            Back to home
          </Link>
          <Link href="/contact" className="border-b border-black/20 pb-0.5 text-sm text-black/60 hover:border-ink hover:text-ink">
            Contact us
          </Link>
        </div>
      </div>
    </div>
  );
}
