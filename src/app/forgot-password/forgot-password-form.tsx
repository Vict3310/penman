"use client";

import { useActionState } from "react";
import { ArrowRight } from "lucide-react";

import { requestPasswordReset } from "@/app/actions/auth";
import { IDLE_RESULT } from "@/lib/action-result";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, IDLE_RESULT);

  return (
    <form action={formAction} className="space-y-5" noValidate>
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
          placeholder="you@penmanempire.com"
          className="field-line"
          aria-invalid={Boolean(state.errors?.email)}
        />
        {state.errors?.email && (
          <p className="mt-2 text-xs text-red-600">{state.errors.email.join(" ")}</p>
        )}
      </div>

      {state.message && (
        <p
          role="status"
          className={
            state.ok
              ? "rounded-xl bg-sage/60 p-3 text-sm text-forest"
              : "rounded-xl bg-red-50 p-3 text-sm text-red-700"
          }
        >
          {state.message}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary group w-full">
        {pending ? "Sending…" : "Send reset link"}
        {!pending && (
          <ArrowRight
            className="h-4 w-4 transition-transform group-hover:translate-x-1"
            strokeWidth={1.5}
          />
        )}
      </button>
    </form>
  );
}
