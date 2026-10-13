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
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth |
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
Supabase                   ← Postgres (+ RLS), Auth, Storage
```

There is no separate API server and no second frontend deployment.

```
src/
  app/
    (site)/                 public pages (shared nav + footer)
    admin/                  protected dashboard
    login/                  administrator sign-in
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
    auth.ts                 server-side authorization
    site.ts                 editable site settings
    supabase/               public / server / admin / browser clients
supabase/
  migrations/               schema, RLS, storage
  seed.sql                  development demonstration data
tests/                      unit tests
```

### Authorization model

Three independent layers, so hiding the admin UI is never the only defence:

1. **Middleware** redirects anonymous visitors away from `/admin` (convenience only).
2. **`requireAdmin()`** runs at the top of every admin page and every admin server
   action. It requires both a `profiles.role = 'admin'` row *and* an email listed in
   `ADMIN_EMAIL_ALLOWLIST`.
3. **Postgres RLS** is enabled on every table. Public visitors can read published
   listings only. Enquiry tables have no anon policy at all — public submissions are
   written by server actions using the service-role key.

---

## Getting started

```bash
npm install
cp .env.example .env.local     # then fill in your Supabase values
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

3. **Development only:** load the demonstration data.

   ```bash
   psql "$DATABASE_URL" -f supabase/seed.sql
   ```

   `seed.sql` inserts clearly `[DEMO]`-labelled records with placeholder imagery.
   **Never run it against production.**

4. Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and
   `SUPABASE_SERVICE_ROLE_KEY` from **Project Settings → API**.

### Verifying the schema without a database

`npm run db:verify` applies both migrations and the seed file to an embedded
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

## Creating the first administrator

Public users cannot register and cannot promote themselves. An administrator is
created deliberately:

1. In the Supabase dashboard, go to **Authentication → Users → Add user**, create the
   account with the owner's email and a strong password. (The `on_auth_user_created`
   trigger automatically creates a matching `profiles` row with role `viewer`.)
2. Promote that account:

   ```sql
   update public.profiles
      set role = 'admin'
    where lower(email) = lower('owner@penmanempire.com');
   ```

3. Add the same address to `ADMIN_EMAIL_ALLOWLIST` in your environment (comma-separate
   multiple administrators).
4. Sign in at `/login`.

Both checks must pass, so a compromised allowlist entry alone is not enough.

---

## Content management

Everything the business owner needs to change lives in `/admin`:

- **Vehicles / Properties / Products** — create, edit, upload and reorder images, set
  prices and stock, feature items, publish, unpublish, archive and delete.
- **Categories** — shop product categories and their display order.
- **Enquiries** — rental, property, shop and contact messages, each with a status
  workflow and private internal notes.
- **Settings** — business name, logo, phone, WhatsApp, email, address, social links,
  homepage hero, about text, footer note and default SEO metadata.

Site content is stored in `site_settings`; featured homepage items are driven by the
`is_featured` flag on each record. No content requires a code change.

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
including authentication redirect URLs, storage policy verification, backups and the
post-deploy verification checklist.

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
