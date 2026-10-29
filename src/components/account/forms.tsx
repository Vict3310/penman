"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useId, useState, useTransition } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Trash2,
} from "lucide-react";

import {
  changePassword,
  signOutOtherDevices,
  toggleSavedListing,
  updateProfile,
} from "@/app/actions/account";
import { IDLE_RESULT } from "@/lib/action-result";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/policy";
import { cn } from "@/lib/utils";
import type { SavedKind } from "@/lib/types";

/* ── Shared field ────────────────────────────────────────────────────── */

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
      <label htmlFor={id} className="field-label">
        {label}
        {hint && <span className="ml-2 normal-case tracking-normal text-black/35">{hint}</span>}
      </label>
      {children}
      {error && error.length > 0 && (
        <p id={`${id}-error`} className="mt-2 text-xs text-red-600">
          {error.join(" ")}
        </p>
      )}
    </div>
  );
}

/** A shared success/failure banner. `role="status"` so it is announced. */
function ResultBanner({ state }: { state: { ok: boolean; message: string } }) {
  if (!state.message) return null;

  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={cn(
        "flex items-start gap-2.5 rounded-xl p-3.5 text-sm",
        state.ok ? "bg-sage/60 text-forest" : "bg-red-50 text-red-700",
      )}
    >
      {state.ok ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
      ) : (
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.5} />
      )}
      {state.message}
    </p>
  );
}

/* ── Personal information ────────────────────────────────────────────── */

/**
 * The profile form.
 *
 * The email field is the interesting one. The address IS the sign-in
 * identifier, so changing it reveals a "current password" field — and the
 * server independently requires that password whenever the address actually
 * changes. Showing the field client-side is a courtesy; the rule is enforced
 * where it counts.
 *
 * A no-op save (the same address in different case, say) demands nothing,
 * because the server compares normalized values before deciding.
 */
export function ProfileForm({
  initialFullName,
  initialEmail,
  initialPhone,
}: {
  initialFullName: string;
  initialEmail: string;
  initialPhone: string;
}) {
  const [state, formAction, pending] = useActionState(updateProfile, IDLE_RESULT);
  const [email, setEmail] = useState(initialEmail);
  const router = useRouter();

  const emailChanging = email.trim().toLowerCase() !== initialEmail.trim().toLowerCase();

  // The name shown in the navigation comes from the server, so a saved change
  // needs a refresh to appear there too.
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state.ok, router]);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <ResultBanner state={state} />

      <Field id="fullName" label="Full name" error={state.errors?.fullName}>
        <input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          required
          defaultValue={initialFullName}
          className={cn("field-line", state.errors?.fullName && "field-line-error")}
          aria-invalid={Boolean(state.errors?.fullName)}
          aria-describedby={state.errors?.fullName ? "fullName-error" : undefined}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id="email"
          label="Email address"
          hint="used to sign in"
          error={state.errors?.email}
        >
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={cn("field-line", state.errors?.email && "field-line-error")}
            aria-invalid={Boolean(state.errors?.email)}
            aria-describedby={state.errors?.email ? "email-error" : "email-note"}
          />
        </Field>

        <Field id="phone" label="Phone number" hint="optional" error={state.errors?.phone}>
          <input
            id="phone"
            name="phone"
            type="tel"
            autoComplete="tel"
            defaultValue={initialPhone}
            placeholder="+234 800 000 0000"
            className={cn("field-line", state.errors?.phone && "field-line-error")}
            aria-invalid={Boolean(state.errors?.phone)}
            aria-describedby={state.errors?.phone ? "phone-error" : undefined}
          />
        </Field>
      </div>

      <p id="email-note" className="text-xs leading-relaxed text-black/45">
        Changing your email address changes how you sign in. We ask for your current password first,
        and the new address counts as unverified until email verification is switched on.
      </p>

      {emailChanging && (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-50/70 p-4">
          <Field
            id="currentPassword"
            label="Current password"
            hint="required to change your email"
            error={state.errors?.currentPassword}
          >
            <input
              id="currentPassword"
              name="currentPassword"
              type="password"
              autoComplete="current-password"
              className={cn(
                "field-line",
                state.errors?.currentPassword && "field-line-error",
              )}
              aria-invalid={Boolean(state.errors?.currentPassword)}
              aria-describedby={state.errors?.currentPassword ? "currentPassword-error" : undefined}
            />
          </Field>
        </div>
      )}

      <button
        type="submit"
        data-testid="profile-submit"
        disabled={pending}
        className="btn-primary group w-full justify-center sm:w-auto"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
            Saving…
          </>
        ) : (
          <>
            Save changes
            {state.ok && <Check className="h-4 w-4" strokeWidth={1.5} />}
          </>
        )}
      </button>

      {state.ok && (
        <p className="text-xs text-black/45">
          Your details were saved. Protected fields — role, account status and your password — cannot
          be changed from this form.
        </p>
      )}
    </form>
  );
}

/* ── Password ────────────────────────────────────────────────────────── */

/** A live requirement tick, mirroring the server's own rules. */
function Requirement({ met, children }: { met: boolean; children: React.ReactNode }) {
  return (
    <li
      className={cn(
        "flex items-center gap-1.5 transition-colors",
        met ? "text-forest" : "text-black/45",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "grid h-3.5 w-3.5 place-items-center rounded-full border",
          met ? "border-forest bg-forest text-white" : "border-black/20",
        )}
      >
        {met ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : null}
      </span>
      {children}
    </li>
  );
}

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, IDLE_RESULT);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [reveal, setReveal] = useState(false);

  const longEnough = next.length >= MIN_PASSWORD_LENGTH;
  const matches = next.length > 0 && next === confirm;
  const different = next.length > 0 && next !== current;

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <ResultBanner state={state} />

      <Field id="currentPassword" label="Current password" error={state.errors?.currentPassword}>
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
          value={current}
          onChange={(event) => setCurrent(event.target.value)}
          className={cn("field-line", state.errors?.currentPassword && "field-line-error")}
          aria-invalid={Boolean(state.errors?.currentPassword)}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="newPassword" label="New password" error={state.errors?.newPassword}>
          <div className="relative">
            <input
              id="newPassword"
              name="newPassword"
              type={reveal ? "text" : "password"}
              autoComplete="new-password"
              required
              value={next}
              onChange={(event) => setNext(event.target.value)}
              className={cn("field-line pr-10", state.errors?.newPassword && "field-line-error")}
              aria-invalid={Boolean(state.errors?.newPassword)}
            />
            <button
              type="button"
              onClick={() => setReveal((value) => !value)}
              aria-label={reveal ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-2 flex items-center px-2 text-black/45 transition-colors hover:text-ink"
            >
              {reveal ? <EyeOff className="h-4 w-4" strokeWidth={1.5} /> : <Eye className="h-4 w-4" strokeWidth={1.5} />}
            </button>
          </div>
        </Field>

        <Field id="confirmPassword" label="Confirm new password" error={state.errors?.confirmPassword}>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type={reveal ? "text" : "password"}
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className={cn("field-line", state.errors?.confirmPassword && "field-line-error")}
            aria-invalid={Boolean(state.errors?.confirmPassword)}
          />
        </Field>
      </div>

      <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs" aria-live="polite">
        <Requirement met={longEnough}>At least {MIN_PASSWORD_LENGTH} characters</Requirement>
        <Requirement met={matches}>Both passwords match</Requirement>
        <Requirement met={different}>Different from your current password</Requirement>
      </ul>

      <button
        type="submit"
        data-testid="password-submit"
        disabled={pending}
        className="btn-primary group w-full justify-center sm:w-auto"
      >
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} />
            Changing…
          </>
        ) : (
          "Change password"
        )}
      </button>

      <p className="text-xs leading-relaxed text-black/45">
        Changing your password signs every other device out. You will stay signed in here.
      </p>
    </form>
  );
}

/* ── Sessions ────────────────────────────────────────────────────────── */

export function SignOutOtherDevices({ otherSessions }: { otherSessions: number }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-black/55">
        {otherSessions === 0
          ? "No other devices are signed in to this account."
          : `${otherSessions} other ${otherSessions === 1 ? "device is" : "devices are"} signed in to this account.`}
      </p>

      <button
        type="button"
        disabled={pending || otherSessions === 0}
        onClick={() =>
          startTransition(async () => {
            const result = await signOutOtherDevices();
            setMessage(result.message);
          })
        }
        className="btn-ghost shrink-0 justify-center"
      >
        {pending ? <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.5} /> : null}
        Sign out other devices
      </button>

      <span role="status" aria-live="polite" className="sr-only">
        {message ?? ""}
      </span>
      {message && <p className="text-xs text-black/50 sm:basis-full">{message}</p>}
    </div>
  );
}

/* ── Saved listing removal ───────────────────────────────────────────── */

/**
 * Remove a saved listing from the account area.
 *
 * Separate from the bookmark button on listing pages because this one sits in
 * a list that must visibly change: it refreshes the route on success so the
 * row disappears, rather than leaving a removed item on screen until the next
 * navigation.
 */
export function RemoveSavedButton({
  kind,
  listingId,
  title,
}: {
  kind: SavedKind;
  listingId: string;
  title: string;
}) {
  const [pending, startTransition] = useTransition();
  const [failed, setFailed] = useState(false);
  const router = useRouter();
  const labelId = useId();

  return (
    <>
      <span id={labelId} className="sr-only">
        {title}
      </span>
      <button
        type="button"
        disabled={pending}
        aria-labelledby={labelId}
        aria-label={`Remove ${title} from saved listings`}
        onClick={() =>
          startTransition(async () => {
            const result = await toggleSavedListing(kind, listingId, false);
            if (result.ok) {
              setFailed(false);
              router.refresh();
            } else {
              setFailed(true);
            }
          })
        }
        className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-2 text-xs text-black/60 transition-colors hover:border-red-500/30 hover:bg-red-50 hover:text-red-700 disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={1.5} />
        ) : (
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
        )}
        Remove
      </button>
      {failed && (
        <span role="alert" className="text-xs text-red-600">
          Could not remove it. Please try again.
        </span>
      )}
    </>
  );
}
