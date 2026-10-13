# Deployment guide — Vercel + Supabase

The whole product is **one** Next.js application. Vercel hosts it; Supabase provides the
database, authentication and image storage.

```
Visitor / Admin → Next.js on Vercel → Supabase (Postgres + Auth + Storage)
```

---

## 1. Prerequisites

- A Supabase project (same one used in development is fine, or a fresh production project)
- A Vercel account
- The repository in Git (GitHub, GitLab or Bitbucket)
- The production domain, if the client has one

---

## 2. Supabase

### 2.1 Apply the migrations

Using the Supabase CLI:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

Or paste `supabase/migrations/0001_init.sql` and then `0002_storage.sql` into the SQL
editor, in that order.

Confirm afterwards that:

- every table in `public` shows **RLS enabled**
- the `media` bucket exists and is **public**
- `storage.objects` has the four `media_*` policies

### 2.2 Configure authentication redirect URLs

**Authentication → URL Configuration**:

- **Site URL:** `https://penmanempire.com`
- **Redirect URLs:** add

  ```
  https://penmanempire.com/**
  https://*.vercel.app/**
  http://localhost:3000/**
  ```

Sign-in here uses email + password, so no OAuth provider is required. If email
confirmation is enabled, remember the owner must confirm before their first sign-in.

### 2.3 Create the first administrator

1. **Authentication → Users → Add user** with the owner's email and a strong password.
   The `on_auth_user_created` trigger creates a `profiles` row with role `viewer`.
2. Promote it:

   ```sql
   update public.profiles
      set role = 'admin'
    where lower(email) = lower('owner@penmanempire.com');
   ```

3. Put the same address in `ADMIN_EMAIL_ALLOWLIST` (see §3).

Never create administrator accounts from the public site — there is deliberately no
public sign-up.

### 2.4 Production data

Do **not** run `supabase/seed.sql` on production — it contains `[DEMO]` placeholder
records. Enter real content through `/admin` after the first deploy.

### 2.5 API keys

**Project Settings → API** gives you:

| Value | Used as | Where it is safe |
| --- | --- | --- |
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` | browser-visible |
| `anon` / publishable key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | browser-visible |
| `service_role` key | `SUPABASE_SERVICE_ROLE_KEY` | **server only — never public** |

The service-role key bypasses RLS. It must never be given a `NEXT_PUBLIC_` prefix and
must never be imported into a client component.

---

## 3. Vercel

1. **Add New → Project** and import the repository. The framework preset is detected
   automatically; no build settings need changing (`next build`).
2. **Settings → Environment Variables** — add for *Production* (and *Preview* if you
   want working previews):

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon / publishable key |
   | `SUPABASE_SERVICE_ROLE_KEY` | your service-role key |
   | `ADMIN_EMAIL_ALLOWLIST` | `owner@penmanempire.com,ops@penmanempire.com` |
   | `NEXT_PUBLIC_SITE_URL` | `https://penmanempire.com` |

   `NEXT_PUBLIC_SITE_URL` drives canonical URLs, the sitemap and `robots.txt`. Set it
   before the first production deploy so metadata is correct from the start.

3. **Deploy.**
4. If the key values change later, redeploy — `next.config.ts` derives its allowed
   image host from `NEXT_PUBLIC_SUPABASE_URL` at build time.

### Custom domain

**Settings → Domains → Add**, then point the client's DNS at Vercel as instructed
(an `A`/`A̶A̶A̶A` record for the apex, `CNAME` for `www`). After the domain is live,
re-add it to the Supabase redirect URLs from §2.2 and update `NEXT_PUBLIC_SITE_URL`,
then redeploy.

> The site is **not** considered deployed until these steps actually succeed — do not
> report the domain as connected before the DNS check passes.

---

## 4. Post-deploy verification checklist

Run through this against the production URL:

**Public site**

- [ ] `/` loads with the hero, three business sections and featured listings
- [ ] `/rental`, `/real-estate`, `/shop` list published records and filters work
- [ ] A detail page loads with its gallery, and a bad slug returns a real 404
- [ ] `/about`, `/contact`, `/privacy`, `/terms` render
- [ ] Mobile navigation opens and closes
- [ ] `/sitemap.xml` lists published listings; `/robots.txt` disallows `/admin`

**Forms**

- [ ] Submitting a rental enquiry with a return date before the pickup date is rejected
- [ ] A valid rental / property / shop / contact submission succeeds
- [ ] Submitting the same form many times in a row is rate limited
- [ ] Each submission appears in the matching `/admin` section

**Admin**

- [ ] `/admin` redirects to `/login` when signed out
- [ ] Signing in with a non-admin account is refused
- [ ] Signing in with the admin account lands on the overview
- [ ] Dashboard counts match the real data (not zero, not invented)
- [ ] Creating, editing, publishing, unpublishing and archiving a vehicle/property/product works
- [ ] Uploading an image in a form stores it and it renders on the public page
- [ ] Deleting an enquiry-referenced listing keeps the enquiry readable
- [ ] Saving Settings changes the public site
- [ ] Destructive actions ask for confirmation

**Security**

- [ ] Requesting a public listing URL while signed out returns only published rows
- [ ] `/admin/enquiries/*` is unreachable without an admin session
- [ ] No secret appears in the browser bundle (search the built JS for the service-role key)

---

## 5. Abuse protection

Public forms are covered by an in-memory, per-instance rate limiter
(`src/lib/rate-limit.ts`) — a first line of defence, not a global one. On Vercel each
serverless instance keeps its own counters.

For production traffic, also enable a platform control:

- Vercel **Firewall / Bot Protection** on `/actions/*` and form POSTs, or
- a WAF rule limiting POST frequency per IP

Sign-in attempts are rate limited separately (8 per 15 minutes per IP).

---

## 6. Backups and recovery

Supabase takes daily automatic backups on paid plans; verify what your plan includes
under **Database → Backups**.

Recommended for a business-critical site:

1. Confirm the automated backup schedule and retention window for your plan.
2. Enable **Point-in-Time Recovery** if the plan offers it — it allows restoring to a
   specific moment rather than only the last daily snapshot.
3. Periodically export a logical dump and store it off-platform:

   ```bash
   supabase db dump --data-only -f backup-$(date +%F).sql
   ```
4. Before any bulk content operation, take a fresh dump.
5. Note that **Storage objects are not included in database backups.** Supabase Storage
   backups depend on your plan; if the client relies on uploaded images, mirror the
   `media` bucket to separate object storage on a schedule.
6. Test a restore into a scratch project at least once, so a real recovery is not the
   first time the procedure is attempted.

---

## 7. Future scope (not implemented)

Deliberately out of scope for this release, and structured to be added later without a
rewrite:

- Cart, checkout and a payment gateway
- Automated payment confirmation and order fulfilment / delivery tracking
- Real-time fleet availability and automated reservation guarantees
- Driver dispatch and scheduling
- Customer accounts

`shop_enquiries` already carries `quantity` and `channel`, and every business record
uses consistent `status` fields, so these can be layered on top.
