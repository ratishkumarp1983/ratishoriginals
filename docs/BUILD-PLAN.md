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
- [x] **Step 4 - Storefront & protected reader** (current checkpoint)
  Public storefront (home + `/browse` with title/description/metadata search),
  document detail page `/book/[slug]` with the FR-3 metadata visibility rule and
  SEO `generateMetadata` (Open Graph), sitemap. Protected pdf.js reader
  `/read/[slug]` with paginated rendering, zoom, dark mode, and a per-session
  watermark (reader email + UTC timestamp). Entitlement is checked AT MINT TIME
  in `/api/documents/[id]/read-url` (admin / completed purchase / active
  membership) before a short-lived signed URL is issued; sample mode is open,
  full mode gated. Signed URLs are same-origin relative. pdf.js worker + standard
  fonts + cmaps are synced into `public/` on postinstall.
  Verified: entitlement 200/403 matrix; reader loads (12 pages), watermark and
  controls present. NOTE: the actual canvas pixels could not be screenshotted
  because the preview pane is hidden in this environment (rAF is throttled when
  `document.hidden`, which stalls canvas paint); pdf.js parsing + operator lists
  resolve fine, so rendering works in a normal visible browser.
- [x] **Step 5 - Purchases, coupons, lifetime access** (current checkpoint)
  Checkout flow: create order (server-computed amount) -> pay -> server-verified
  completion -> grant lifetime access (a COMPLETED Purchase, which
  `getReadAccess` already honours). Mock gateway fully working in dev; Razorpay
  checkout.js + webhook wired for prod. Webhook verification mandatory; the
  client callback and the webhook both complete idempotently. Coupon engine
  (percentage/fixed, expiry, usage limit, one-time-per-user, member-only,
  doc-specific) with a live discount preview; free / 100%-off titles grant
  instantly with no payment round-trip. Admin coupon CRUD + UI; real Buy button
  -> `/checkout/[slug]`; purchased titles appear in the library.
  Verified end-to-end via curl: 403->buy->200 access; single redemption and
  usedCount despite a double completion; webhook completes on valid signature
  and 400s on bad; every coupon rule (expired/members/one-time/limit/bad code)
  rejects correctly. 25 tests, build/lint/typecheck green.
- [x] **Step 6 - Memberships** (current checkpoint)
  Admin plan CRUD (`/admin/memberships`) with member-only title assignment;
  public `/membership` page; subscribe flow reusing the payment adapter
  (order -> pay -> activate) through the unified `completeOrder` dispatcher so
  purchases and subscriptions share one idempotent verify/webhook/mock path.
  Status lifecycle ACTIVE/EXPIRED/PENDING with lazy expiry (no cron): reads
  downgrade lapsed rows and sync the denormalized User.membershipStatus. New
  periods append to remaining time (early renewals never lose days). Member-only
  content grants full read access via MembershipDocument (no purchase needed);
  member checks are DB-authoritative so member-only coupons work the moment a
  subscription activates. Account + header surface membership state.
  Verified end-to-end via curl: subscribe -> ACTIVE (365 days), single
  activation despite double-complete; member-only 403 -> assign -> 200 with zero
  purchases; member coupon applies once active; forced expiry lazily downgrades
  to EXPIRED and revokes access + the coupon. 25 tests, build/lint/typecheck green.
- [x] **Step 7 - Reader library & progress** (current checkpoint)
  Library split into Owned (lifetime) and From-your-membership sections, each
  card showing a progress bar + resume point (reading history folded into the
  library per the owner's call), with a Continue-reading rail for in-progress
  titles. Reading progress (FR-10): the reader auto-resumes to the saved page
  (with a "start from the beginning" control) and persists last page / completion
  % debounced in full mode; the progress endpoint re-checks entitlement and
  clamps the page server-side. Named per-title bookmarks (a new `Bookmark` model)
  add/jump/delete in the reader toolbar. Wishlist (FR-13): a dedicated `/wishlist`
  page plus a save/unsave control on the book page (owned titles read
  "In your library"). Owned wins over membership and duplicate plan titles show
  once. Verified live end-to-end via curl: progress save/clamp/entitlement
  (403)/anon (401), bookmark create/list/upsert/delete/entitlement, wishlist
  add/idempotent/remove and both button states, library owned + membership
  sections with dedup and the continue-reading rail. One migration
  (`add_bookmark`); tsc/lint/build green, 30 tests.
- [x] **Step 8 - Admin dashboard & analytics** (current checkpoint)
  Real FR-14 analytics: a `DocumentView` table (views recorded by a client
  beacon on the book page, so link prefetches do not inflate; admin previews and
  drafts excluded, light per-IP cap) and `UserMembership.amount` captured at
  activation so revenue stays accurate if plan prices change. `/admin/analytics`
  shows six KPI tiles (views, purchases, conversion, revenue = sales +
  memberships, active memberships, coupon redemptions) with an All-time /
  Last-30-days toggle, a per-title performance table (views / purchases /
  conversion / revenue), and a coupon-usage table; the `/admin` dashboard now
  carries the headline business KPIs. `/admin/audit` is a paginated, action-
  filtered audit-log viewer. Conversion + range math are pure and unit-tested.
  Verified live with seeded data: revenue and split, conversion %, views with
  draft/admin exclusion and the 30-day filter, per-title and coupon tables, the
  view rate-limit, and reader lockout (307). One migration
  (`analytics_views_membership_amount`); tsc/lint/build green, 35 tests.
- [x] **Step 9 - Reviews & ratings (SRS FR-12)** (current checkpoint)
  No migration (schema already had Review / ReviewVote / ReviewEdit). Eligibility:
  only a completed purchase or an active membership covering the title lets a
  reader review it, and the verified-purchase / verified-member badges derive
  from that access (never client-set). One review per reader per title (upsert)
  with an edit audit trail (ReviewEdit snapshots the prior version on every
  change) and delete (votes + edits cascade). Book page shows average, total,
  the 5-bar rating distribution, featured (pinned) + latest reviews, sorting
  (most helpful / highest / lowest / newest / oldest), helpful / not-helpful
  votes (one per reader, togglable, self-vote blocked), spoiler collapse, and
  public admin replies. Admin `/admin/reviews`: analytics tiles + tables
  (average, count, highest / lowest-rated titles, most helpful) and a moderation
  list (hide / restore / pin / unpin / reply / delete), all audited. Reader-side
  reporting is deferred to Phase 2 (owner call). Verified live: eligibility
  403/401, both verified badges, edit snapshot, votes + self-vote 400 + toggle,
  average and distribution, spoiler collapse, every moderation action, analytics
  page, and admin authz (307 / 403). tsc/lint/build green, 38 tests (3 new).
- [ ] **Step 10 - Hardening & delivery**
  Rate limiting, security headers/CSP, SEO (sitemap, structured data, OG),
  legal pages, Sentry/PostHog wiring, Dockerfile, CI, deployment docs.

### Brand home pass (author-brand storefront)

Between Steps 6 and 7, on the owner's strategy call (revenue + publicity), the
public surface was rebranded to a premium author-brand look:

- Theme: navy / gold / cream palette + Playfair Display serif display via CSS
  brand tokens (fixed, not light/dark adaptive); rebranded shared header and a
  new footer.
- Author-forward home (auth-aware): flagship hero, trust strip, latest releases,
  membership CTA, about-the-author, and newsletter. Logged-in readers get a
  library-first hero; visitors get the marketing view. No fabricated social
  proof (no fake reader/review counts) - real data populates as earned.
- Owned-audience engine: real newsletter capture (NewsletterSubscriber model +
  `/api/newsletter`, dedupe, welcome email via the email adapter).
- `BookCover` component renders a premium styled panel and overlays a real
  cover only when one loads at a usable size (no empty placeholder boxes).
- Legal page stubs (terms / privacy / refund) so footer links resolve; real
  content lands in Step 10.

### External adversarial security + QA audit (post Step 6 / brand home)

An external adversarial reviewer audited the revenue path. Confirmed sound:
server-computed amounts, verified payment/webhook signatures, per-order
idempotency, entitlement + signed-URL boundary, admin authz, input validation
(no 500s), no stored-XSS, no client secret leakage. Findings fixed and
re-verified live:

- HIGH: coupon usage-limit / one-time / already-owned bypass (create-vs-complete
  TOCTOU). Fixed with DB uniques (`Purchase(userId,documentId)`,
  `CouponRedemption(couponId,userId)`), an upsert-per-title checkout, and a
  coupon reservation that counts in-flight orders. Reproduced the exact exploit:
  now 1 purchase / usedCount 1 / 1 redemption (was 3/3/3).
- MED: no login throttle -> per-IP + per-account rate limit in `authorize`
  (correct password refused after repeated failures).
- MED: password reset did not invalidate JWTs (JWT strategy) -> `User.tokenVersion`
  bumped on reset and checked every request (also refreshes role/membership).
- MED: registration enumerated via status code -> identical 201 + equalised
  timing.
- MED: `X-Forwarded-For` spoofing defeated IP limits -> trust proxy-set headers,
  else take the last hop.
- Security headers added (`next.config.ts`): nosniff, frame DENY, referrer,
  permissions-policy, HSTS, and a production CSP.

See `docs/EXTERNAL-REVIEW-PROMPT.md` for the reusable audit brief.

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
