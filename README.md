# Penman Empire

A single Next.js application for **Penman Empire**, covering three businesses under one brand:

1. **Automobile rentals** — `/rental` catalogue and per-vehicle enquiry forms
2. **Real estate** — `/real-estate` listings and per-property enquiry forms
3. **Online shop** — `/shop` catalogue and per-product order enquiries

All three share one database, one design system, one authentication system and one
administration dashboard at `/admin`.

---

## Stack

| Concern | Choice |
| --- | --- |
| Framework | Next.js (App Router) with Turbopack |
| Language | TypeScript, `strict` + `noUncheckedIndexedAccess` |
| Styling | Tailwind CSS, tokens ported from `design.html` |
| Components | Hand-rolled primitives (Radix UI underneath where a component needs it) |
| Database | PostgreSQL (Supabase, Neon or any Postgres) |
| Auth | Application-owned: Argon2id passwords, server-managed sessions |
| Email | Resend (password resets only) |
| Storage | Supabase Storage (public `media` bucket) |
| Server logic | Server Actions and Server Components only |
| Validation | Zod, shared by public forms and admin CRUD |
| Forms | React Hook Form is available; the shipped forms use `useActionState` |
| Hosting | Vercel (single deployable) |
| Tests | Vitest (unit) + embedded-Postgres schema verification |

---

## Architecture

```
Visitor / Admin
      │
      ▼
Next.js on Vercel          ← all pages, server actions and route handlers
      │
      ▼
Supabase                   ← Postgres (+ RLS), Storage
Postgres (DATABASE_URL)    ← accounts, sessions, reset tokens (direct `pg`)
```

There is no separate API server and no second frontend deployment. Authentication
is owned by the application itself (see `src/lib/auth/`): passwords are hashed with
Argon2id, and sessions are opaque tokens whose hashes live in `public.sessions`.
There is no third-party identity provider in the request path.

```
src/
  app/
    (site)/                 public pages (shared nav + footer)
    (site)/account/         customer account area
    admin/                  protected dashboard
    login/                  sign-in for every account
    actions/
      public.ts             public enquiry submissions
      admin.ts              authorized CRUD
      auth.ts               sign in / sign out
  components/
    admin/                  dashboard UI
    ui/                     primitives
  lib/
    queries.ts              data access (public + admin)
    validation.ts           Zod schemas
    auth/                   passwords, sessions, authorization
    site.ts                 editable site settings
    supabase/               public / server / admin / browser clients
supabase/
  migrations/               schema, RLS, storage
  seed.sql                  development demonstration data
tests/                      unit tests
```

### Authorization model

Three independent layers, so hiding the admin UI is never the only defence:

1. **Proxy (`src/proxy.ts`)** redirects traffic without a session cookie away from
   `/account` (convenience only).
2. **`requireAdminPage()` / `getAdminSession()`** run at the top of every admin page
   and every admin server action. They resolve the session cookie against the
   database on every request and require `profiles.role = 'admin'`. The role is the
   only signal: `ADMIN_EMAIL_ALLOWLIST` no longer grants access.
3. **`requireCustomer()`** guards the account layout the same way, resolving the
   session rather than trusting the cookie's presence.
4. **Postgres RLS** is enabled on every table. Public visitors can read published
   listings only. Enquiry tables have no anon policy at all — public submissions are
   written by server actions using the service-role key. `sessions` and
   `password_reset_tokens` have RLS enabled and **no** policy, so they are readable
   only through the server's `pg` connection.

---

## Getting started

```bash
npm install
cp .env.example .env.local     # fill in Supabase values and DATABASE_URL
npm run dev                    # http://localhost:3000
```

Useful scripts:

```bash
npm run dev         # development server
npm run build       # production build
npm start           # serve the production build
npm run typecheck   # tsc --noEmit
npm test            # Vitest unit tests
npm run db:verify   # apply migrations + seed to an embedded Postgres
```

### Seeing the site before you connect Supabase

`npm run dev` runs in **demonstration mode**: because no database is connected, the
catalogue is filled with clearly-labelled `[DEMO]` listings so you can review the
design and the enquiry flows immediately.

```bash
npm run dev        # demo listings appear automatically
```

To see demo listings from a production build as well (e.g. `npm run build && npm start`),
set `DEMO_DATA=true` in `.env.local` — this is already done for you in this working copy.

Demo mode is deliberately hard to reach in production:

- it is **impossible** while Supabase is configured — connecting your project removes it,
- it never activates in a production build unless `DEMO_DATA=true` is set explicitly.

Every demo record is prefixed `[DEMO]`, contact details use the reserved `.example`
domain and a non-dialable number, and images come from an allow-listed placeholder host.

> Without demo mode, the public site still degrades gracefully when Supabase is not
> configured: pages render a clear "Database not connected" notice instead of crashing.

---

## Database setup

1. Create a Supabase project.
2. Run the migrations in order — via the Supabase CLI:

   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

   …or paste each file from `supabase/migrations/` into the Supabase SQL editor, in
   filename order:

      - `0001_init.sql` — tables, indexes, constraints, triggers, RLS policies
   - `0002_storage.sql` — the public `media` bucket and its access policies
   - `0003_own_auth.sql` — application-owned accounts, sessions and reset tokens
   - `0004_account_area.sql` — per-customer enquiry ownership and saved listings
   - `0005_imported_inventory.sql` — imported inventory provenance and audit runs

3. **Development only:** load the demonstration data.

   ```bash
   psql "$DATABASE_URL" -f supabase/seed.sql
   ```

   `seed.sql` inserts clearly `[DEMO]`-labelled records with placeholder imagery.
   **Never run it against production.**

4. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
   `SUPABASE_SERVICE_ROLE_KEY` from **Project Settings → API**, and set
   `DATABASE_URL` to the project's direct Postgres connection string (used for
   accounts, sessions and password changes).

### Verifying the schema without a database

`npm run db:verify` applies every migration and the seed file to an embedded
PostgreSQL engine (PGlite) with the small pieces of Supabase's own schema stubbed in,
then asserts the result: every table exists with RLS enabled, every policy is present
and correctly gated, constraints genuinely reject invalid data, triggers maintain
`updated_at`, and the seed loads with the expected row counts.

It is a fast, offline pre-flight check — useful in CI — but it is **not** a substitute
for testing against a real Supabase project, which adds extensions, roles and the
`auth`/`storage` services.

The migrations require **no extensions**: `gen_random_uuid()` is part of PostgreSQL
core from v13 onward, which every current Supabase project runs.

---

## Accounts and the first administrator

Customers register at `/signup` and sign in at `/login`; they land in `/account`.
Registration is open, but it cannot create an administrator: the INSERT that
registers a customer never names `role`, so the database default (`viewer`) applies.
A forgotten password is recovered at `/forgot-password`: the link is emailed through
Resend, works once, expires after 60 minutes and revokes every existing session.

An administrator is created deliberately, once, with the operator-run bootstrap
script (it talks to `DATABASE_URL` directly and is not reachable from a request):

```bash
npm run create-admin -- --email owner@penmanempire.com
# prompts for a password, or pass --password for non-interactive use
```

It refuses to overwrite an existing account. To promote an existing customer,
change `profiles.role` in SQL instead:

```sql
update public.profiles
   set role = 'admin'
 where lower(email) = lower('owner@penmanempire.com');
```

Access to `/admin` is decided by `profiles.role` on every request. The
`ADMIN_EMAIL_ALLOWLIST` variable is only a default email for the bootstrap script;
it does not grant access.

---

## Content management

Everything the business owner needs to change lives in `/admin`:

- **Vehicles / Properties / Products** — create, edit, upload and reorder images, set
  prices and stock, feature items, publish, unpublish, archive and delete.
- **Categories** — shop product categories and their display order.
- **Enquiries** — rental, property, shop and contact messages, each with a status
  workflow and private internal notes.
- **Import** — review imported stock held as drafts, then publish it (see below).
- **Settings** — business name, logo, phone, WhatsApp, email, address, social links,
  homepage hero, about text, footer note and default SEO metadata.

Site content is stored in `site_settings`; featured homepage items are driven by the
`is_featured` flag on each record. No content requires a code change.

---

## Imported inventory

Cars for sale can be brought in from an external dataset instead of being typed in by
hand. The importer writes into the same `products` catalogue the shop already uses —
there is no second inventory — and it is deliberately narrow about what it will do.

```bash
npm run cars:import -- --dry-run     # report only; writes no products at all
npm run cars:import -- --limit 12    # a small first batch, held as drafts
npm run cars:import                  # every record, still as drafts
npm run cars:import -- --publish     # publish as it imports, skipping review
npm run cars:import -- --help
```

Source: the Hugging Face dataset `Binaryy/cars-for-sale` (1,332 for-sale listings with
price, mileage and condition). Other flags: `--images embedded|url|none`,
`--dataset <path|url>`, `--refresh`, `--only-missing`, `--batch <n>`, `--quiet`.

**How it stays safe**

- Imported rows are the only rows it writes. Every statement is scoped to
  `inventory_source = 'huggingface:Binaryy/cars-for-sale'`, so a hand-curated listing is
  outside its reach by construction. It never deletes, never resets a table, and never
  writes to `vehicles` — the rental fleet, which this data cannot honestly describe.
- Re-running is a no-op. Each row stores a hash of exactly what the importer wrote
  (`specs.import_hash`); a row that no longer matches it has been edited here since, and
  is skipped rather than overwritten.
- Listings arrive as `draft` and `unavailable`, so nothing reaches the catalogue until
  it is reviewed at `/admin/import`. Imported cards and pages are always labelled, the
  price is attributed to the source marketplace, and availability is never claimed.
- Every run is recorded: `inventory_imports` holds the summary (counts by reason,
  dataset revision) and `.cache/cars-import/logs/` holds the per-record detail.

**Images.** By default the JPEG bytes shipped inside the dataset are validated (magic
bytes, not the extension), size-capped at the bucket's 5 MB limit and uploaded into the
existing `media` storage bucket. `--images url` fetches the original URL instead, with a
15-second timeout, bounded retries and `403`/`404` treated as permanent. `--images none`
imports without pictures. Objects are keyed by content hash, so the same picture is
never stored twice, and a failed picture leaves the card's placeholder in place.

**Before publishing publicly:** the dataset declares no licence, and its photographs
originate from a third-party Nigerian marketplace. Confirm the rights first — which is
why the import is held as drafts. No imported car is ever added to the rental fleet.

---

## Enquiry workflow (initial release)

This release is deliberately enquiry-based:

- A visitor submits a form. It is validated on the server, rate limited, and stored.
- **Nothing is confirmed, reserved or charged automatically.** The owner reviews each
  enquiry in the dashboard and changes its status.
- WhatsApp is offered as an alternative contact route with a prefilled message.

No payment gateway, cart, delivery tracking or automated availability guarantee is
implemented. The schema (`quantity`, `channel`, `status`) is structured so a cart and
checkout can be layered on later without a rewrite.

---

## SEO

- Server-rendered public pages with per-page `<title>`, meta description and canonical URL.
- Dynamic `sitemap.xml` generated from published listings.
- `robots.txt` that disallows `/admin`, `/login` and `/api`.
- Open Graph metadata and JSON-LD structured data on detail pages, generated only from
  real record data.
- Optimised images through `next/image`; remote patterns are derived from your Supabase
  host at build time.

---

## Deployment

See **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** for the full Vercel + Supabase runbook,
including the database and TLS settings, administrator bootstrap, storage policy
verification, backups and the post-deploy verification checklist.

---

## What the business owner still needs to provide

The application ships with **no fabricated business information**. Before launch the
owner must supply:

- Real contact details (phone, WhatsApp, email, address, opening hours)
- Genuine listing content: vehicles, properties and products, with their own photographs
- Final hero, about and footer copy
- Social media URLs
- Legal review of `/privacy` and `/terms`
- The production domain, if it differs from `penmanempire.com`

Until these are entered, the site shows honest empty states and the development seed
data is clearly marked `[DEMO]`.
