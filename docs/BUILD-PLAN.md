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

## Phase 1 — MVP (SRS §16)

- [x] **Step 1 — Foundation** ✅ *(current checkpoint)*
  Next.js + TS + Tailwind scaffold; complete Prisma schema (SRS §10 + audit +
  future-marketplace tables); adapter layer (storage/payments/scan/email);
  env validation; docker-compose (Postgres+Redis); seed (admin/metadata/
  membership); Vitest; docs. Build + typecheck + tests green.
- [ ] **Step 2 — Authentication**
  Auth.js v5: Google OAuth + email/password (Argon2id), registration, password
  reset (email adapter), session management, secure cookies, CSRF; role guard;
  admin bootstrap. Turnstile hook (bypassed until keys set).
- [ ] **Step 3 — Documents & dynamic metadata (admin)**
  Admin upload pipeline (validate → scan → store → extract pages → thumbnail →
  metadata → publish); dynamic metadata field CRUD; document CRUD; slugs/SEO.
- [ ] **Step 4 — Storefront & protected reader**
  Public catalog, search, document pages (metadata visibility rule), sample
  reading (configurable `samplePages`), protected paginated reader with
  per-session watermark, signed short-lived page fetches, entitlement checks.
- [ ] **Step 5 — Purchases, coupons, lifetime access**
  Buy flow → coupon apply → amount calc → Razorpay order → webhook → grant
  lifetime access; coupon engine (percentage/fixed, expiry, usage limits,
  one-time, member-only, doc-specific).
- [ ] **Step 6 — Memberships**
  Plan config, subscribe (Razorpay), status lifecycle (ACTIVE/EXPIRED/PENDING),
  member-only content, member discounts.
- [ ] **Step 7 — Reader library & progress**
  Library (purchased + membership), reading history, continue reading, progress
  (last page / completion %), wishlist.
- [ ] **Step 8 — Admin dashboard & analytics**
  Sales, views, conversion, revenue, memberships, coupon usage; audit-log
  viewer.
- [ ] **Step 9 — Reviews & ratings (SRS FR-12)**
  Eligibility (purchase/membership/grant), CRUD with edit audit trail, verified
  badges, helpful votes, spoiler protection, moderation, distribution display,
  review analytics.
- [ ] **Step 10 — Hardening & delivery**
  Rate limiting, security headers/CSP, SEO (sitemap, structured data, OG),
  legal pages, Sentry/PostHog wiring, Dockerfile, CI, deployment docs.

## Phase 2 (SRS §17) — later
Wishlist enhancements, recommendations, reading notes, collections.

## Phase 3 (SRS §18) — later
Multiple authors, revenue sharing, author payouts, marketplace.
