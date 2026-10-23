# Deployment guide — Vercel + Supabase

The whole product is **one** Next.js application. Vercel hosts it; Supabase provides the
database and image storage. Authentication is owned by the application: Passwords are
hashed with Argon2id and sessions are stored in `public.sessions`, reached over
`DATABASE_URL` with the `pg` driver.

```
Visitor / Admin → Next.js on Vercel → Supabase (Postgres + Storage)
                                    → Postgres via DATABASE_URL (accounts + sessions)
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

Or paste every file in `supabase/migrations/` into the SQL editor in filename order:
`0001_init.sql`, `0002_storage.sql`, `0003_own_auth.sql`, `0004_account_area.sql`,
`0005_imported_inventory.sql`.

Confirm afterwards that:

- every table in `public` shows **RLS enabled**
- `public.sessions` and `public.password_reset_tokens` have RLS enabled and **no**
  policy (they are server-only by construction)
- `public.profiles` no longer depends on `auth.users`
- the `media` bucket exists and is **public**
- `storage.objects` has the four `media_*` policies

### 2.2 Authentication configuration

No Supabase Auth configuration is required: the application does not use Supabase
Auth, so there are no redirect URLs or email templates to set there. Sign-in is
email + password against `public.profiles`. The deployment settings that matter are
a reachable `DATABASE_URL` and, for password reset, a Resend key (see §3).

Optional session tuning: `AUTH_SESSION_TTL_DAYS` (1–90, default 7) and
`AUTH_COOKIE_SECURE` (defaults to on in production).

Password reset lives at `/forgot-password` and `/reset-password`. Links are single
use, expire after 60 minutes, and revoke every session when used.

### 2.3 Create the first administrator

Customers can sign up at `/signup`, but they can never become administrators; the
registration path does not accept a role at all. Bootstrap the first administrator
once, against `DATABASE_URL`:

```bash
npm run create-admin -- --email owner@penmanempire.com
```

The script prompts for a password and refuses to overwrite an existing account.
To promote an existing customer instead:

```sql
update public.profiles
   set role = 'admin'
 where lower(email) = lower('owner@penmanempire.com');
```

`ADMIN_EMAIL_ALLOWLIST` is not an access check; it is only the default email for the
bootstrap script.

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
   | `DATABASE_URL` | your Postgres connection string |
   | `RESEND_API_KEY` | Resend key for password-reset email |
   | `EMAIL_FROM` | `Penman Empire <no-reply@penmanempire.com>` |
   | `ADMIN_EMAIL_ALLOWLIST` | `owner@penmanempire.com` (bootstrap default only) |
   | `NEXT_PUBLIC_SITE_URL` | `https://penmanempire.com` |

   `NEXT_PUBLIC_SITE_URL` drives canonical URLs, the sitemap and `robots.txt`. Set it
   before the first production deploy so metadata is correct from the start.

   `DATABASE_URL` must be the **direct** Postgres connection string (or a pooler URL),
   not the PostgREST endpoint: account creation, password changes and session
   revocation are transactions. Remote hosts are always connected over TLS; the peer
   certificate is not verified by default because Supabase's pooler chain does not
   resolve. Set `DATABASE_SSL_VERIFY=true` where the chain does resolve, or
   `sslmode=verify-full` in the URL.

   The old `BETTER_AUTH_SECRET`, `BETTER_AUTH_API_KEY`, `AUTH_SECRET` and `CLERK_*`
   variables are no longer read — delete them if they are still set.

   Password-reset mail is sent through Resend. Verify the sending domain under
   Resend → Domains first, then set `EMAIL_FROM` to an address on it. Without
   `RESEND_API_KEY`, the reset form still answers normally but no mail is sent —
   a server log records the omission.

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

- [ ] `/admin` returns the custom 404 when signed out
- [ ] Signing in with a non-admin account reaches `/account`, not `/admin`
- [ ] Signing in with the admin account lands on the overview
- [ ] Dashboard counts match the real data (not zero, not invented)
- [ ] Creating, editing, publishing, unpublishing and archiving a vehicle/property/product works
- [ ] Uploading an image in a form stores it and it renders on the public page
- [ ] Deleting an enquiry-referenced listing keeps the enquiry readable
- [ ] Saving Settings changes the public site
- [ ] Destructive actions ask for confirmation

**Accounts**

- [ ] Signing up at `/signup` creates an account and lands in `/account`
- [ ] `/account` redirects to `/login?next=…` when signed out, and returns there after
- [ ] Changing the password signs out other devices and keeps this one signed in
- [ ] "Forgot password?" on `/login` sends a link, and the link sets a new password once
- [ ] An expired or reused reset link is refused with a clear message
- [ ] Saving and removing a listing works, and only affects the signed-in customer

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

Sign-in attempts are rate limited separately (8 per 10 minutes per IP), and password
changes are limited to 8 per 10 minutes per session.

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
- Email verification for new accounts (password-reset mail exists, but nothing
  proves the customer owns the address)

Customer accounts already exist: `/signup`, `/login` and `/account` (overview, profile,
security, saved listings and enquiry history).

`shop_enquiries` already carries `quantity` and `channel`, and every business record
uses consistent `status` fields, so these can be layered on top.
