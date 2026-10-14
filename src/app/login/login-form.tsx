"use client";

import { useActionState, useState } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { signIn } from "@/app/actions/auth";
import { IDLE_RESULT } from "@/lib/action-result";

export function LoginForm({ next, disabled }: { next: string; disabled?: boolean }) {
  const [state, formAction, pending] = useActionState(signIn, IDLE_RESULT);
  const [showPassword, setShowPassword] = useState(false);

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
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            disabled={disabled}
            placeholder="••••••••"
            className="field-line pr-10"
            aria-invalid={Boolean(state.errors?.password)}
          />
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((value) => !value)}
            className="absolute inset-y-0 right-3 flex items-center text-black/50"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
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
