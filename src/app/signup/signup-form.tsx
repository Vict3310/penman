"use client";

import { ArrowRight, Check, Eye, EyeOff } from "lucide-react";
import { useActionState, useState } from "react";

import { signUp } from "@/app/actions/auth";
import { IDLE_RESULT } from "@/lib/action-result";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/policy";
import { cn } from "@/lib/utils";

/**
 * Customer sign-up form.
 *
 * The password requirement checklist is driven by the same constant the server
 * validates against (src/lib/auth/policy.ts), so the two cannot disagree. It is
 * a convenience only: the rules are re-checked on the server, where they
 * actually matter.
 */
export function SignupForm() {
  const [state, formAction, pending] = useActionState(signUp, IDLE_RESULT);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const longEnough = password.length >= MIN_PASSWORD_LENGTH;
  const matches = password.length > 0 && password === confirm;

  const errorFor = (field: string) => state.errors?.[field];

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <Field id="fullName" label="Full name" error={errorFor("fullName")}>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          required
          placeholder="Chima Okonkwo"
          className={cn("field-line", errorFor("fullName") && "field-line-error")}
          aria-invalid={Boolean(errorFor("fullName"))}
        />
      </Field>

      <Field id="email" label="Email address" error={errorFor("email")}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          className={cn("field-line", errorFor("email") && "field-line-error")}
          aria-invalid={Boolean(errorFor("email"))}
        />
      </Field>

      <Field
        id="phone"
        label="Phone number"
        hint="Optional"
        error={errorFor("phone")}
      >
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder="+234 800 000 0000"
          className={cn("field-line", errorFor("phone") && "field-line-error")}
          aria-invalid={Boolean(errorFor("phone"))}
        />
      </Field>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field id="password" label="Password" error={errorFor("password")}>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className={cn("field-line pr-10", errorFor("password") && "field-line-error")}
              aria-invalid={Boolean(errorFor("password"))}
            />
            <RevealToggle
              shown={showPassword}
              onToggle={() => setShowPassword((value) => !value)}
              label="password"
            />
          </div>
        </Field>

        <Field
          id="confirmPassword"
          label="Confirm password"
          error={errorFor("confirmPassword")}
        >
          <div className="relative">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              required
              placeholder="••••••••"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              className={cn("field-line pr-10", errorFor("confirmPassword") && "field-line-error")}
              aria-invalid={Boolean(errorFor("confirmPassword"))}
            />
            <RevealToggle
              shown={showConfirm}
              onToggle={() => setShowConfirm((value) => !value)}
              label="confirmation"
            />
          </div>
        </Field>
      </div>

      {/* Live requirements. Purely advisory — the server is the authority. */}
      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-black/55" aria-live="polite">
        <Requirement met={longEnough}>
          At least {MIN_PASSWORD_LENGTH} characters
        </Requirement>
        <Requirement met={matches}>
          Both passwords match
        </Requirement>
      </ul>

      <div className="flex items-start gap-3 rounded-2xl bg-sage/40 p-4">
        <input
          id="acceptTerms"
          name="acceptTerms"
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-black/25 text-forest accent-forest focus:ring-forest"
          aria-invalid={Boolean(errorFor("acceptTerms"))}
        />
        <label htmlFor="acceptTerms" className="text-sm leading-relaxed text-black/65">
          I agree to the{" "}
          <a href="/terms" className="underline decoration-black/25 underline-offset-2 hover:text-forest">
            terms of service
          </a>{" "}
          and the{" "}
          <a href="/privacy" className="underline decoration-black/25 underline-offset-2 hover:text-forest">
            privacy policy
          </a>
          .
        </label>
      </div>

      {errorFor("acceptTerms") && (
        <p className="text-xs text-red-600">{errorFor("acceptTerms")?.join(" ")}</p>
      )}

      {!state.ok && state.message && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {state.message}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary group w-full justify-center">
        {pending ? "Creating your account…" : "Create account"}
        {!pending && (
          <ArrowRight
            className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
            strokeWidth={1.5}
          />
        )}
      </button>
    </form>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string[];
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="field-label">
          {label}
        </label>
        {hint && <span className="text-[11px] uppercase tracking-[0.18em] text-black/35">{hint}</span>}
      </div>
      {children}
      {error && (
        <p className="mt-2 text-xs text-red-600">{error.join(" ")}</p>
      )}
    </div>
  );
}

function RevealToggle({
  shown,
  onToggle,
  label,
}: {
  shown: boolean;
  onToggle: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={shown ? `Hide ${label}` : `Show ${label}`}
      className="absolute inset-y-0 right-3 flex items-center text-black/45 transition-colors hover:text-forest"
    >
      {shown ? <EyeOff className="h-4 w-4" strokeWidth={1.6} /> : <Eye className="h-4 w-4" strokeWidth={1.6} />}
    </button>
  );
}

function Requirement({ met, children }: { met: boolean; children: React.ReactNode }) {
  return (
    <li className={cn("flex items-center gap-1.5 transition-colors", met && "text-forest")}>
      <span
        className={cn(
          "grid h-4 w-4 shrink-0 place-items-center rounded-full border transition-colors",
          met ? "border-forest bg-forest text-white" : "border-black/25 text-transparent",
        )}
      >
        <Check className="h-2.5 w-2.5" strokeWidth={3} />
      </span>
      {children}
    </li>
  );
}
