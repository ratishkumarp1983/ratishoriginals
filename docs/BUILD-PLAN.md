# Build Plan

Built to the SRS in phases, with a **review checkpoint at the end of each
step**. Work stops for sign-off before the next step; the plan is never
auto-run to completion.

## Deliberate deviations from the SRS

| SRS | This build | Why |
| --- | ---------- | --- |
| Next.js 15 | Next.js 16 | Current stable; App Router is a compatible superset. |
| Prisma (unversioned) | Prisma 6 | Prisma 7 mandates driver adapters + `prisma.config.ts`; v6's `url` config is simpler and well-documented. |
| Rasterise PDF → page images | Hybrid: protected pdf.js reader + dynamic watermark, page store ready for rasterisation | Ships the protection guarantees faster; architecture keeps the rasterise path open. |
| $ examples | INR (configurable) | Razorpay is INR-primary. |
| Real R2/Razorpay/ClamAV/Resend | Dev adapters, real via env | Cred-free local dev; production wiring is a config change. |

Tell me if any deviation should be reversed.

## Phase 1 - MVP (SRS §16)

- [x] **Step 1 - Foundation** ✅ *(current checkpoint)*
  Next.js + TS + Tailwind scaffold; complete Prisma schema (SRS §10 + audit +
  future-marketplace tables); adapter layer (storage/payments/scan/email);
  env validation; docker-compose (Postgres+Redis); seed (admin/metadata/
  membership); Vitest; docs. Build + typecheck + tests green.
- [x] **Step 2 - Authentication** ✅ *(current checkpoint)*
  Auth.js v5 (JWT sessions): Google OAuth (conditional) + email/password
  (Argon2id) via Credentials; registration API; password reset (request +
  single-use hashed token + completion, via the email adapter); role/membership
  carried in the session; server-side guards (`requireUser`/`requireAdmin`) as
  the enforcement boundary + coarse middleware redirect; rate limiting +
  Turnstile hook (bypassed until keys set); auth UI (login/register/forgot/
  reset) with shadcn/ui. Build + typecheck + lint + 10 tests green; full flow
  (register → auto-login → guarded pages → admin role → logout → reset) verified
  in-browser against Postgres.
- [x] **Step 3 - Documents & dynamic metadata (admin)** ✅ *(current checkpoint)*
  Upload pipeline (validate → virus scan → convert-to-PDF → sample generation →
  store) via a new conversion adapter (PDF passthrough; LibreOffice driver for
  DOC/DOCX/TXT/RTF behind `CONVERT_DRIVER`); document create/edit/delete with
  storage rollback; dynamic metadata-field CRUD; unique slugs + SEO fields;
  protected `/api/files` (signed-token) + public cover route; admin UI
  (dashboard, documents list, create/edit form, metadata manager). Verified
  end-to-end: real 12-page PDF uploaded via authed multipart → pageCount=12,
  sample clamped to 4 pages, files stored, metadata linked, audit logged;
  auth boundary (401 anon / 403 reader); 15 tests, build/lint/typecheck green.
- [ ] **Step 4 - Storefront & protected reader**
  Public catalog, search, document pages (metadata visibility rule), sample
  reading (configurable `samplePages`), protected paginated reader with
  per-session watermark, signed short-lived page fetches, entitlement checks.
- [ ] **Step 5 - Purchases, coupons, lifetime access**
  Buy flow → coupon apply → amount calc → Razorpay order → webhook → grant
  lifetime access; coupon engine (percentage/fixed, expiry, usage limits,
  one-time, member-only, doc-specific).
- [ ] **Step 6 - Memberships**
  Plan config, subscribe (Razorpay), status lifecycle (ACTIVE/EXPIRED/PENDING),
  member-only content, member discounts.
- [ ] **Step 7 - Reader library & progress**
  Library (purchased + membership), reading history, continue reading, progress
  (last page / completion %), wishlist.
- [ ] **Step 8 - Admin dashboard & analytics**
  Sales, views, conversion, revenue, memberships, coupon usage; audit-log
  viewer.
- [ ] **Step 9 - Reviews & ratings (SRS FR-12)**
  Eligibility (purchase/membership/grant), CRUD with edit audit trail, verified
  badges, helpful votes, spoiler protection, moderation, distribution display,
  review analytics.
- [ ] **Step 10 - Hardening & delivery**
  Rate limiting, security headers/CSP, SEO (sitemap, structured data, OG),
  legal pages, Sentry/PostHog wiring, Dockerfile, CI, deployment docs.

### Step 3 review round (independent reviewer + QA)

After Step 3, an independent code review and an adversarial QA pass ran. All
findings were triaged and the real defects fixed + re-verified at runtime:

- Corrupt / encrypted / zero-page PDF now returns a clean 400 (was 500).
- Unknown (well-formed) `metadataId` returns 400 (was a Prisma FK 500).
- `price` is enforced as required (a missing price no longer becomes 0).
- Oversize/invalid cover is validated before any bytes are stored, and the
  whole create path rolls back deterministically - no orphaned files.
- Editing only `samplePages` now rebuilds `sample.pdf` (was leaving it stale).
- Cover image is enforced server-side (SRS FR-2 mandatory field).
- Hardening: rate limit on uploads, cover magic-byte check + `nosniff`,
  `JSON.parse` guarded, P2002/P2025 mapped to 409/404, 401 vs 403 messages,
  proper boolean parsing for metadata `active`.

## Phase 2 (SRS §17) - later
Wishlist enhancements, recommendations, reading notes, collections.

## Phase 3 (SRS §18) - later
Multiple authors, revenue sharing, author payouts, marketplace.
