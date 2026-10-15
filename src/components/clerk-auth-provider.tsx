"use client";

import { ClerkProvider } from "@clerk/nextjs";

export function ClerkAuthProvider({ children }: { children: React.ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

  if (!publishableKey) {
    return <>{children}</>;
  }

  return <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/">{children}</ClerkProvider>;
}
