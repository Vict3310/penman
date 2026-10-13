"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { signIn } from "@/app/actions/auth";
import { IDLE_RESULT } from "@/lib/action-result";

export function LoginForm({ next, disabled }: { next: string; disabled?: boolean }) {
  const [state, formAction, pending] = useActionState(signIn, IDLE_RESULT);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="next" value={next} />

      <div>
        <label htmlFor="email" className="field-label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          disabled={disabled}
          placeholder="you@penmanempire.com"
          className="field-line"
          aria-invalid={Boolean(state.errors?.email)}
        />
        {state.errors?.email && <p className="mt-2 text-xs text-red-600">{state.errors.email.join(" ")}</p>}
      </div>

      <div>
        <label htmlFor="password" className="field-label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={disabled}
          placeholder="••••••••"
          className="field-line"
          aria-invalid={Boolean(state.errors?.password)}
        />
        {state.errors?.password && <p className="mt-2 text-xs text-red-600">{state.errors.password.join(" ")}</p>}
      </div>

      {!state.ok && state.message && (
        <p role="alert" className="text-sm text-red-600">
          {state.message}
        </p>
      )}

      <button type="submit" disabled={pending || disabled} className="btn-primary group w-full">
        {pending ? "Signing in…" : "Sign in"}
        {!pending && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={1.5} />}
      </button>
    </form>
  );
}
