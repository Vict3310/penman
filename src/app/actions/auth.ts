"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { fail, succeed, type ActionResult } from "@/lib/action-result";
import { getAdminUser, isExplicitAdminFlag } from "@/lib/admin-access";
import { getServerClient } from "@/lib/supabase/server";
import { zodFieldErrors } from "@/lib/validation";

const signInSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
  next: z.string().optional(),
});

const signUpSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name"),
    email: z.string().trim().email("Enter a valid email address"),
    password: z.string().min(8, "Use at least 8 characters"),
    confirmPassword: z.string().min(8, "Confirm your password"),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export async function signIn(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));
  }

  const { email, password, next } = parsed.data;

  try {
    const supabase = await getServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      return fail("Those credentials did not work. Please check and try again.");
    }

    const user = await getAdminUser();
    if (!user) {
      return fail("That account does not have administrator access to this site.");
    }

    const target = next && next.startsWith("/") ? next : "/admin";
    redirect(target);
  } catch {
    return fail("Sign-in failed. Please try again.");
  }

  return fail("Unable to continue.");
}

export async function signUp(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const parsed = signUpSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return fail("Please check the highlighted fields.", zodFieldErrors(parsed.error));
  }

  const { fullName, email, password } = parsed.data;

  try {
    const supabase = await getServerClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      return fail(error.message || "Registration failed.");
    }

    const createdUser = data.user;
    if (!createdUser) {
      return fail("Your account was not created. Please try again.");
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, role, is_admin")
      .eq("id", createdUser.id)
      .maybeSingle();

    if (profileError) {
      console.error("Profile lookup failed after sign-up:", profileError.message);
      return fail("Your account was created, but profile setup could not be verified.");
    }

    if (profile && !isExplicitAdminFlag(profile)) {
      return succeed("Account created successfully. Please sign in to continue.");
    }

    return succeed("Account created successfully. Please sign in to continue.");
  } catch {
    return fail("Sign-up failed. Please try again.");
  }
}

export async function signOut(): Promise<void> {
  try {
    const supabase = await getServerClient();
    await supabase.auth.signOut();
  } catch {
    // Ignore and still redirect.
  }
  redirect("/login");
}
