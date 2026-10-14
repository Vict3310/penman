"use client";

import { useActionState, useState } from "react";
import { ArrowRight, Eye, EyeOff } from "lucide-react";

import { signUp } from "@/app/actions/auth";
import { IDLE_RESULT } from "@/lib/action-result";

export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUp, IDLE_RESULT);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <div>
        <label htmlFor="fullName" className="field-label">
          Full name
        </label>
        <input id="fullName" name="fullName" type="text" autoComplete="name" required className="field-line" />
        {state.errors?.fullName && <p className="mt-2 text-xs text-red-600">{state.errors.fullName.join(" ")}</p>}
      </div>

      <div>
        <label htmlFor="email" className="field-label">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className="field-line" />
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
            autoComplete="new-password"
            required
            className="field-line pr-10"
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

      <div>
        <label htmlFor="confirmPassword" className="field-label">
          Confirm password
        </label>
        <div className="relative">
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showConfirmPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            className="field-line pr-10"
          />
          <button
            type="button"
            aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            onClick={() => setShowConfirmPassword((value) => !value)}
            className="absolute inset-y-0 right-3 flex items-center text-black/50"
          >
            {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        {state.errors?.confirmPassword && (
          <p className="mt-2 text-xs text-red-600">{state.errors.confirmPassword.join(" ")}</p>
        )}
      </div>

      {!state.ok && state.message && (
        <p role="alert" className="text-sm text-red-600">
          {state.message}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary group w-full">
        {pending ? "Creating account…" : "Create account"}
        {!pending && <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" strokeWidth={1.5} />}
      </button>
    </form>
  );
}
