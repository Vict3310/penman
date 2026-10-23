"use client";

import { useActionState, useState } from "react";
import { ArrowRight, Check, Eye, EyeOff } from "lucide-react";

import { resetPassword } from "@/app/actions/auth";
import { IDLE_RESULT } from "@/lib/action-result";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/policy";
import { cn } from "@/lib/utils";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPassword, IDLE_RESULT);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const longEnough = password.length >= MIN_PASSWORD_LENGTH;
  const matches = password.length > 0 && password === confirm;
  const errorFor = (field: string) => state.errors?.[field];

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="token" value={token} />

      <div>
        <label htmlFor="password" className="field-label">
          New password
        </label>
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
        {errorFor("password") && (
          <p className="mt-2 text-xs text-red-600">{errorFor("password")?.join(" ")}</p>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="field-label">
          Confirm new password
        </label>
        <div className="relative">
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            required
            placeholder="••••••••"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className={cn("field-line pr-10", errorFor("confirmPassword") && "field-line-error")}
            aria-invalid={Boolean(errorFor("confirmPassword"))}
          />
        </div>
        {errorFor("confirmPassword") && (
          <p className="mt-2 text-xs text-red-600">{errorFor("confirmPassword")?.join(" ")}</p>
        )}
      </div>

      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-black/55" aria-live="polite">
        <Requirement met={longEnough}>At least {MIN_PASSWORD_LENGTH} characters</Requirement>
        <Requirement met={matches}>Both passwords match</Requirement>
      </ul>

      {!state.ok && state.message && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
          {state.message}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn-primary group w-full justify-center">
        {pending ? "Saving…" : "Set new password"}
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
