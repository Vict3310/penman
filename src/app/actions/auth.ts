"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/better-auth";
import { isAdminEmail, isBetterAuthConfigured } from "@/lib/env";
import { clientKey, rateLimit } from "@/lib/rate-limit";
import { fail, type ActionResult } from "@/lib/action-result";
import { zodFieldErrors } from "@/lib/validation";

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
  next: z.string().optional(),
});

async function applySetCookieHeaders(response: Response) {
  const cookieStore = await cookies();
  const setCookies = response.headers.getSetCookie?.() ?? [];

  for (const entry of setCookies) {
    const [nameValue] = entry.split(";");
    if (!nameValue) continue;
    const separatorIndex = nameValue.indexOf("=");
    if (separatorIndex === -1) continue;
    const name = nameValue.slice(0, separatorIndex).trim();
    const value = nameValue.slice(separatorIndex + 1).trim();

    if (!name) continue;
    if (value.length === 0) {
      cookieStore.delete(name);
      continue;
    }

    cookieStore.set(name, value, { path: "/" });
  }
}

export async function signIn(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  if (!isBetterAuthConfigured()) {
    return fail("Authentication is not configured on this deployment yet.");
  }

  const limit = rateLimit(await clientKey("signin"), 8, 15 * 60 * 1000);
  if (!limit.ok) {
    return fail("Too many sign-in attempts. Please wait a few minutes and try again.");
  }

  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));
  }

  const { email, password, next } = parsed.data;
  const invalid = "Those credentials did not work. Please check and try again.";

  try {
    const response = await auth.api.signInEmail({
      body: {
        email,
        password,
      },
      asResponse: true,
      headers: new Headers({
        origin: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
      }),
    });

    await applySetCookieHeaders(response);

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      const message = payload?.message ?? invalid;
      if (message.toLowerCase().includes("admin") || message.toLowerCase().includes("allowlist")) {
        return fail("That account does not have administrator access to this site.");
      }
      return fail(message || invalid);
    }

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.email || !isAdminEmail(session.user.email)) {
      return fail("That account does not have administrator access to this site.");
    }
  } catch {
    return fail("Sign-in failed. Please try again.");
  }

  const target = next && next.startsWith("/") ? next : "/admin";
  redirect(target);
}

export async function signOut(): Promise<void> {
  try {
    const response = await auth.api.signOut({
      asResponse: true,
      headers: new Headers({
        origin: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
      }),
    });
    await applySetCookieHeaders(response);
  } catch {
    // Ignore — the redirect below still clears the user's route access.
  }
  redirect("/login");
}
