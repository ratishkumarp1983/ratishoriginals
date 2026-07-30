# Go-live checklist

Everything to do before taking real traffic and real money. Grouped by area.
See `docs/DEPLOYMENT.md` for how to deploy.

## Secrets and configuration

- [ ] `AUTH_SECRET` set to a strong random value (32+ chars), not the dev default.
- [ ] `ADMIN_PASSWORD` changed from the seeded `ChangeMe-Admin-123456`, and the
      seeded admin's password actually rotated (re-seed or change in the DB).
- [ ] `APP_URL` set to the real HTTPS domain (drives reset links, SEO, robots,
      sitemap, and structured-data URLs).
- [ ] `TRUST_PROXY=true` (the app is behind App Platform / a reverse proxy that
      sets a real client IP and strips client-supplied IP headers). Without this,
      per-IP limits including the login throttle do not work correctly.

## Payments (Razorpay)

- [ ] `PAYMENTS_DRIVER=razorpay` with live `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET`.
- [ ] `RAZORPAY_WEBHOOK_SECRET` set, and the webhook registered at
      `/api/webhooks/razorpay` for `payment.captured` / `order.paid`.
- [ ] Tested end to end in Razorpay test mode first: order -> pay -> access granted.

## Storage, email, bot protection

- [ ] `STORAGE_DRIVER=r2` with R2 credentials; a real cover and document upload
      works and files are served through the signed-URL route.
- [ ] `EMAIL_DRIVER=resend` with `RESEND_API_KEY` and a verified `EMAIL_FROM`.
- [ ] `TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` set so bot protection is
      enforced (it is bypassed while unset).

## Data

- [ ] `npx prisma migrate deploy` run against production.
- [ ] `npm run db:seed` run once (admin, metadata fields, sample membership).
- [ ] Redis (`REDIS_URL`) connected, so rate limits are shared across instances.

## Content and legal

- [ ] Legal pages: replace every `[PLACEHOLDER]` in terms, privacy, and refund
      (legal entity, contact email, address, jurisdiction, refund window, dates)
      and have them reviewed by a qualified professional.
- [ ] Real author photo, book covers, and social links in place of placeholders.

## Security headers / CSP

- [ ] Confirm the production CSP against the live Razorpay checkout. The policy
      uses `strict-dynamic` (no `script-src 'unsafe-inline'`). If Razorpay's
      checkout needs `'unsafe-eval'`, add it to `script-src` in `src/lib/csp.ts`
      (a documented tradeoff) and re-test. Verify a real checkout opens and
      completes with no CSP violations in the browser console.

## Observability (optional but recommended)

- [ ] `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` for error monitoring.
- [ ] `NEXT_PUBLIC_POSTHOG_KEY` + `NEXT_PUBLIC_POSTHOG_HOST` for product analytics.
      (Both are env-gated; the CSP already allows their hosts when the keys are set.)

## Final smoke test on production

- [ ] Register a reader, receive the email, sign in.
- [ ] Buy a title (real gateway), confirm lifetime access and it appears in the library.
- [ ] Subscribe to a membership, confirm member-only access.
- [ ] Read a title: resume, bookmarks, and progress work.
- [ ] Submit a review, vote, and moderate it from the admin.
- [ ] Admin analytics and audit log populate; `robots.txt` and `sitemap.xml` resolve.
