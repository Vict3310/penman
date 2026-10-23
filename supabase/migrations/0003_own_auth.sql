-- ════════════════════════════════════════════════════════════════════════
-- Penman Empire — application-owned authentication
-- ────────────────────────────────────────────────────────────────────────
-- Penman Empire owns its user identity, credentials and sessions. This
-- migration removes the hard dependency on Supabase Auth so the application
-- can verify passwords and manage sessions itself, while keeping the existing
-- Postgres database, the existing `profiles` rows and every working feature.
--
-- What changes
--   1. profiles.id is no longer a foreign key to auth.users, so an account
--      can exist with no Supabase auth user behind it.
--   2. The auth.users trigger that used to auto-provision profiles is dropped.
--      The application now creates the account row explicitly, in a
--      transaction, with safe default permissions.
--   3. profiles gains credential, contact and lifecycle columns.
--   4. Two new tables hold server-managed sessions and single-use password
--      reset tokens. Only a SHA-256 hash of each token is ever stored.
--
-- What deliberately does NOT change
--   * public.is_admin() is left exactly as-is. It resolves auth.uid(), which
--     is NULL for application-owned sessions, so it now evaluates to false for
--     everyone — a strictly safer default than before. Privileged reads and
--     writes already run through the service-role client
--     (src/lib/supabase/admin.ts) *after* a server-side session check, so no
--     administrative path depends on it.
--   * Every existing RLS policy, index, constraint and trigger on the business
--     tables is untouched.
--
-- Rollback: additive apart from the two DROP statements, which can be restored
-- by re-running 0001_init.sql.
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. Detach profiles from Supabase Auth ───────────────────────────────

drop trigger if exists on_auth_user_created on auth.users;

drop function if exists public.handle_new_user();

-- The constraint name is PostgreSQL's default for 0001's inline REFERENCES.
alter table public.profiles
  drop constraint if exists profiles_id_fkey;

-- Accounts are now created by the application, which supplies the id.
alter table public.profiles
  alter column id set default gen_random_uuid();

-- ── 2. Credential, contact and lifecycle columns ────────────────────────

alter table public.profiles
  add column if not exists password_hash     text,
  add column if not exists phone             text,
  add column if not exists status            text not null default 'active',
  add column if not exists email_verified_at timestamptz,
  add column if not exists last_login_at     timestamptz;

-- password_hash is intentionally NULLABLE, and that is meaningful rather than
-- sloppy: a row with a NULL hash is a real account that cannot sign in yet.
-- That is exactly the state of any profile carried over from Supabase Auth,
-- whose password hash cannot be imported, and of a staff account awaiting an
-- invitation. Such accounts must complete the reset-password flow before they
-- can authenticate. This is what makes the migration safe — no existing
-- profile is destroyed, and none is left holding a guessable password.
--
-- email_verified_at is reserved for a later verification step; it is not
-- enforced while no email provider is configured.

alter table public.profiles
  drop constraint if exists profiles_status_check;

-- Account status is checked separately from role so an account can be
-- suspended without losing the permissions it should regain on re-enable.
alter table public.profiles
  add constraint profiles_status_check
  check (status in ('active', 'disabled'));

-- ── 3. Normalize emails at the database level ───────────────────────────
-- 0001 already enforces uniqueness on lower(email). This trigger guarantees
-- the stored value is itself lowercase and trimmed, so the unique index is
-- exact rather than merely case-insensitive and no code path can store
-- "Owner@PenmanEmpire.com " alongside "owner@penmanempire.com".

create or replace function public.normalize_profile_email()
returns trigger
language plpgsql
as $$
begin
  new.email = lower(trim(new.email));
  return new;
end;
$$;

drop trigger if exists trg_profiles_normalize_email on public.profiles;

create trigger trg_profiles_normalize_email
  before insert or update of email on public.profiles
  for each row execute function public.normalize_profile_email();

-- ── 4. Server-managed sessions ──────────────────────────────────────────
-- No localStorage, no client-side boolean. A session exists only if a row
-- here does, and the row stores a hash — never the token that was sent.

create table if not exists public.sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  token_hash   text not null unique,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  last_seen_at timestamptz,
  revoked_at   timestamptz
);

create index if not exists sessions_user_id_idx    on public.sessions (user_id);
create index if not exists sessions_expires_at_idx on public.sessions (expires_at);

-- ── 5. Single-use password reset tokens ─────────────────────────────────

create table if not exists public.password_reset_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at    timestamptz
);

create index if not exists password_reset_tokens_user_id_idx
  on public.password_reset_tokens (user_id);

-- ── 6. Lock the authentication tables down completely ───────────────────
-- Row Level Security with NO policy denies every anonymous and every
-- authenticated request. These tables are reachable only through the
-- service-role client from server code that has already validated a session.
-- There is deliberately no policy here: a session row must never be readable
-- from the browser, and the absence of a policy is the strongest available
-- guarantee of that.

alter table public.sessions              enable row level security;
alter table public.password_reset_tokens enable row level security;
