"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Server-side errors are logged by the platform; keep the client log terse
    // and free of any data that could contain personal information.
    console.error("Application error", error.digest ?? "");
  }, [error]);

  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="max-w-md text-center">
        <p className="eyebrow mb-6">Something went wrong</p>
        <h1 className="font-display text-4xl font-light tracking-tighter sm:text-5xl">
          We hit an
          <br />
          <em className="font-serif font-normal italic">unexpected error.</em>
        </h1>
        <p className="mt-6 text-base text-black/60">
          Please try again. If it keeps happening, contact us directly and we will help.
        </p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-5">
          <button type="button" onClick={reset} className="btn-primary">
            Try again
          </button>
          <Link href="/" className="border-b border-black/20 pb-0.5 text-sm text-black/60 hover:border-ink hover:text-ink">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
