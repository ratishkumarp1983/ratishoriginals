# Deployment (DigitalOcean App Platform)

This app runs on a Node runtime and uses native modules (Argon2), the default
Prisma engine over TCP, `ioredis`, and Node-runtime route handlers. That makes a
standard Node host the right fit and rules out edge-only platforms. The
recommended target is **DigitalOcean App Platform, deployed from source (no
Docker)**, which sidesteps past Docker issues and needs zero re-architecture.

Managed pieces used alongside it:

- **Database:** Neon (Postgres) - already in use.
- **Redis:** Upstash or DigitalOcean Managed Valkey/Redis.
- **File storage:** Cloudflare R2 (S3-compatible) or DigitalOcean Spaces.

You can host the app on DigitalOcean and still use Cloudflare R2 for storage;
they are independent.

## 1. Provision the managed services

1. **Postgres (Neon):** create a project and database; copy the pooled
   connection string.
2. **Redis (Upstash):** create a database; copy the `redis://` (or `rediss://`)
   URL.
3. **Storage (Cloudflare R2):** create a bucket and an API token; note the
   account id, access key, secret, bucket name, and S3 endpoint.

## 2. Create the App

1. DigitalOcean -> Apps -> Create App -> GitHub -> select
   `ratishkumarp1983/ratishoriginals`, branch `master`.
2. It auto-detects a Node app. Set:
   - **Build command:** `npm run build`
   - **Run command:** `npm run start`
   - **HTTP port:** `3000`
3. Choose an instance size (Basic is fine to launch).

## 3. Environment variables

Set these on the App (mark secrets as encrypted). See `.env.example` for the
full list; the production-critical ones:

```
NODE_ENV=production
APP_URL=https://your-domain
TRUST_PROXY=true                # App Platform sits behind a proxy
AUTH_SECRET=<32+ random chars>

DATABASE_URL=<Neon pooled connection string>
REDIS_URL=<Upstash redis URL>

PAYMENTS_DRIVER=razorpay
RAZORPAY_KEY_ID=<live key id>
RAZORPAY_KEY_SECRET=<live key secret>
RAZORPAY_WEBHOOK_SECRET=<webhook secret>

STORAGE_DRIVER=r2
R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... R2_SECRET_ACCESS_KEY=...
R2_BUCKET=... R2_ENDPOINT=...

EMAIL_DRIVER=resend
RESEND_API_KEY=...
EMAIL_FROM="Ratish Originals <no-reply@your-domain>"

TURNSTILE_SITE_KEY=... TURNSTILE_SECRET_KEY=...

# Optional observability
SENTRY_DSN=... NEXT_PUBLIC_SENTRY_DSN=... SENTRY_ENVIRONMENT=production
NEXT_PUBLIC_POSTHOG_KEY=... NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Bootstrap admin (used only by the seed script)
ADMIN_EMAIL=you@your-domain
ADMIN_PASSWORD=<strong password>
```

## 4. Run database migrations

Migrations are not run automatically. Either:

- add a **pre-deploy job** to the App with command `npx prisma migrate deploy`
  (recommended), or
- run it once locally against the production `DATABASE_URL`:
  `DATABASE_URL=... npx prisma migrate deploy` then `DATABASE_URL=... npm run db:seed`.

Seeding creates the admin, the dynamic metadata fields, and a sample membership.
Run it once.

## 5. Domain, TLS, and Razorpay webhook

1. Add your custom domain in the App settings; App Platform provisions TLS.
2. In the Razorpay dashboard, add a webhook to
   `https://your-domain/api/webhooks/razorpay` with the same
   `RAZORPAY_WEBHOOK_SECRET`, subscribed to `payment.captured` / `order.paid`.

## 6. Verify

- App loads over HTTPS; `Content-Security-Policy` header is present with a nonce.
- Register, sign in, buy a title (start in Razorpay test mode), read it, review it.
- `robots.txt` and `sitemap.xml` resolve.

## Alternative: DigitalOcean Droplet (no Docker)

If you prefer a VM matching your other apps: run `npm run build` then
`npm run start` under a systemd service, behind Caddy or Nginx as a reverse
proxy (which sets a real client IP so `TRUST_PROXY=true` holds). Same env vars
and migration steps apply. This gives more control but more manual operations
than App Platform.

See `docs/GO-LIVE.md` for the full pre-launch checklist.
