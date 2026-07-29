# External adversarial code review and QA prompt

Hand the text below to an independent reviewer (a person, a fresh Claude Code
session, or another tool) that has the repository but NOT the build history.

---

You are an independent, adversarial senior security engineer and QA lead. Your
job is to break this product before real users and real money do. Assume
nothing works until you have proven it. Be skeptical, creative, and specific.
Do not fix code; report findings. You may create throwaway test files and test
data, but do not commit anything, and clean up test data you create.

## What this is

Ratish Originals ("Ratish Originals") is a single-author digital publishing and
reading platform: an author uploads written works, readers preview samples, buy
titles (lifetime access) or subscribe to a membership, and read protected
documents online. It is architected to expand to multiple authors later.

- Stack: Next.js 16 (App Router) + TypeScript + Prisma 6 + PostgreSQL +
  Auth.js v5 + Razorpay (mock gateway in dev) + Cloudflare R2 (local disk in
  dev) + Redis. Tailwind v4 + shadcn (Base UI). pdf.js for the reader.
- External services sit behind adapters with dev drivers (storage, payments,
  virus scan, doc-to-PDF conversion, email), selected by env vars.
- Built to an SRS. Read these first for scope and intent:
  - `docs/BUILD-PLAN.md` (what is built, what is deliberately deferred)
  - `docs/ARCHITECTURE.md` (design and security model)
  - `docs/srs_extract.txt` (the extracted SRS requirements: FR-1..FR-14,
    section 7 payments, section 8 security)

## What is in scope

Everything committed. The revenue path and the public brand site are the
priority. Focus on: authentication, authorization/entitlements, the
checkout/purchase flow, coupons, memberships, the protected reader and file
serving, the admin upload pipeline, and input validation across all API routes.

## Environment setup (self-contained)

Windows or POSIX; Node 20+, Docker Desktop running.

1. `npm install`
2. `cp .env.example .env` (dev defaults are fine: `PAYMENTS_DRIVER=mock`,
   `STORAGE_DRIVER=local`, `SCAN_DRIVER=stub`, `EMAIL_DRIVER=console`).
3. `docker compose up -d` then `npm run db:migrate` and `npm run db:seed`.
   - IMPORTANT: Postgres is published on host port 5544, not 5432 (a native
     Postgres commonly owns 5432). The connection string in `.env` already uses
     5544. If you see `P1000` auth errors, this is why.
4. `npm run dev` (defaults to port 3000; examples below assume
   `http://localhost:3000`, adjust if you run `-p 4600`).

Seeded state: one admin (`admin@ratishoriginals.local` /
`ChangeMe-Admin-123456`), one published document ("The Sample Book", price
INR 199, 12 pages, 4 sample pages), one membership plan ("Premium Reader", INR
2900 / 365 days), and 9 dynamic metadata fields. There is NO seeded reader:
register your own via the UI or `POST /api/register`.

Checks you should run: `npx tsc --noEmit`, `npm run lint`, `npx vitest run`.
For `npm run build`, STOP the dev server first: running a Turbopack build while
`next dev` is live corrupts the shared `.next` and produces phantom
"module not found" errors (a known dev-tooling quirk, not a product bug).

## Getting an authenticated session for API testing (Auth.js v5)

Use a cookie jar with curl:

```bash
BASE=http://localhost:3000
JAR=./jar.txt
CSRF=$(curl -s -c "$JAR" "$BASE/api/auth/csrf" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).csrfToken))")
curl -s -b "$JAR" -c "$JAR" -X POST "$BASE/api/auth/callback/credentials" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "csrfToken=$CSRF" \
  --data-urlencode "email=admin@ratishoriginals.local" \
  --data-urlencode "password=ChangeMe-Admin-123456" \
  --data-urlencode "callbackUrl=$BASE"
# then use -b "$JAR" on subsequent requests
```

Inspect the database directly:
`docker exec ratishoriginals-postgres psql -U ratishoriginals -d ratishoriginals -c "SELECT ..."`
Stored document/sample/cover files live under `./.storage/documents/<id>/`.

## Attack the highest-risk areas first

Payments and access control are where a bug costs money or gives away content.

1. Money and checkout (`src/lib/purchases.ts`, `src/lib/pricing.ts`,
   `src/app/api/checkout/**`, `src/app/api/webhooks/razorpay/route.ts`,
   `src/lib/orders.ts`).
   - Can you obtain a completed purchase or an active membership without paying?
   - Is the amount computed server-side, or can the client influence it? Try
     tampering with prices, coupon codes, and any amount fields.
   - Forge or replay the checkout verify signature and the webhook signature.
     The mock and real gateways use HMAC-SHA256; confirm verification actually
     gates access and cannot be bypassed with an empty/mismatched signature.
   - Idempotency and races: fire the client callback and the webhook for the
     same order, concurrently and repeatedly. Look for double access grants,
     double coupon redemption, or double membership extension.
   - Can you complete an order that belongs to another user (the dev-only
     mock-complete endpoint)?
   - Free and 100%-off paths: any way to abuse instant grant?
   - Decimal/rounding: probe percentage and fixed discounts for rounding drift
     or negative totals. Confirm minor-unit conversion is exact.
   - Order type confusion: a single order id maps to a purchase or a
     membership; can you cross them in the unified completer?

2. Entitlement and protected content (`src/lib/entitlements.ts`,
   `src/app/api/documents/[id]/read-url/route.ts`, `src/app/api/files/route.ts`,
   `src/lib/adapters/storage/local.ts`).
   - Can a user who has not bought a title read the full document? Try the
     read-url endpoint in `mode=full` without entitlement.
   - Signed URLs are short-lived HMAC tokens. Confirm entitlement is checked at
     MINT time (the token is an unbound bearer). Try forging, replaying past
     expiry, and swapping the `key` parameter (path traversal, reading another
     document's original, or arbitrary files).
   - Can you read a DRAFT (unpublished) document as a non-admin?
   - Member-only content after membership expiry: does access revoke?

3. Coupons (`src/lib/coupons.ts`, `src/app/api/coupons/validate/route.ts`,
   admin coupon routes).
   - Bypass one-time-per-user, usage-limit, expiry, member-only, and
     document-specific rules. Race concurrent redemptions to exceed the limit.
   - Negative, zero, huge, or non-numeric discount values at creation.
   - Case sensitivity and whitespace in codes; can two coupons collide?

4. Memberships (`src/lib/membership.ts`, subscribe + admin membership routes).
   - Expiry lifecycle: force an expiry in the DB and confirm lazy downgrade and
     access revocation on the next read. Any window where an expired member
     still has access or a member coupon still applies?
   - Renewal math: can early renewal be abused for cheap infinite access, or
     lose paid days?
   - Session vs DB desync: the JWT carries membershipStatus. Confirm gating
     (member coupons, member content) trusts the DB, not a stale session.

5. Auth (`src/auth.ts`, `src/app/api/register`, password reset routes,
   `src/lib/auth-helpers.ts`, `src/middleware.ts`).
   - Account enumeration on register / forgot-password. Reset token: single
     use, expiry, not guessable, not leaked in URLs or responses.
   - Role escalation: can a READER reach any `/api/admin/**` or `/admin` page?
     Confirm 401 for anonymous and 403 for non-admins on every admin route.
   - Session integrity, CSRF on state-changing routes, secure cookie flags.
   - Rate limiting: is it actually enforced and non-bypassable? (Note Turnstile
     is bypassed in dev by design.)

6. Admin upload pipeline (`src/lib/documents/**`, `src/app/api/admin/**`).
   - IDOR by id across documents, coupons, memberships, metadata.
   - Malicious uploads: non-PDF renamed to .pdf, corrupt/encrypted/zero-page
     PDF, oversized file and cover, path traversal in filenames, non-image
     cover bytes. The server must return clean 4xx, never 500 or a crash, and
     must never orphan stored files.
   - Stored-XSS: values that render on public pages (document title,
     description, metadata values, membership benefits) - try script/HTML
     payloads and check the rendered book, browse, and membership pages.

7. General web: missing security headers / CSP, secrets leaking into the client
   bundle, verbose error messages, SSRF via any URL input, and any endpoint
   that 500s on malformed input instead of validating.

## Deliberate deviations and not-yet-built (do not report these as bugs)

- Next.js 16 (SRS said 15) and Prisma 6 are intentional.
- Dev drivers are mocks: payments (mock gateway), storage (local disk), email
  (console), virus scan (stub), doc conversion (PDF passthrough; only PDF is
  accepted in dev, other formats are rejected with guidance by design).
- The reader is a hybrid pdf.js reader with a per-session watermark, not
  server-side rasterization. Serving the file to an entitled browser is
  inherent to this approach; flag only if entitlement or the signed-URL
  boundary is broken, not the approach itself.
- Not yet built (deferred to later steps, per BUILD-PLAN): reading progress /
  continue-reading / wishlist beyond a basic library list; admin analytics;
  the reviews and ratings feature (FR-12) UI; production hardening, security
  headers/CSP, full SEO, real legal-page content, Sentry/PostHog wiring, CI,
  Docker deploy. Legal pages are intentional stubs. Testimonials are absent on
  purpose (no fabricated social proof). Author photo, book cover art, and
  social links are placeholders.
- The protected reader's canvas cannot be screenshotted in a headless or hidden
  browser because requestAnimationFrame is throttled there, which stalls canvas
  paint. This is environmental. Verify reader logic (pdf.js loads the doc, the
  read-url entitlement gate, the watermark and controls in the DOM) rather than
  pixels; it renders in a normal visible browser.

## What to deliver

A written report with:

1. A ranked findings list (Critical / High / Medium / Low / Nit). For each:
   `file:line`, a one-line claim, a CONCRETE reproduction (exact requests, curl
   commands, inputs, or click steps), expected vs actual, and a suggested fix.
   Mark each finding CONFIRMED (you reproduced it) or THEORETICAL.
2. Separate sections for: security findings, functional QA failures, and SRS
   conformance gaps (FR-x / section 7 / section 8) that are genuinely missing
   rather than deferred.
3. Results of `npx tsc --noEmit`, `npm run lint`, `npx vitest run`, and a build
   (with the dev server stopped).
4. An overall risk assessment and a clear verdict: is this safe to connect to a
   real Razorpay account and take real money in its current state, and if not,
   what are the blocking issues.

Be rigorous and adversarial, but do not invent nitpicks or flag the deliberate
decisions above. Real, reproducible problems only.
