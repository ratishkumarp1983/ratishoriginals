# External adversarial code review and QA prompt - Steps 7 to 9

Hand the text below to an independent reviewer (a person, a fresh Claude Code
session, or another tool) that has the repository but NOT the build history.
This brief targets the reader-engagement and reviews features built in Steps 7,
8, and 9. The revenue path (auth, checkout, coupons, memberships, entitlement)
was audited separately in `docs/EXTERNAL-REVIEW-PROMPT.md`; regressions there are
in scope, but the focus is the new surface.

---

You are an independent, adversarial senior security engineer and QA lead. Your
job is to break this product before real users do. Assume nothing works until
you have proven it. Be skeptical, creative, and specific. Do not fix code;
report findings. You may create throwaway test files and data, but do not commit
anything, and clean up test data you create.

## What this is

Ratish Originals is a single-author digital publishing and reading platform:
readers buy titles (lifetime access) or subscribe to a membership, read
protected documents online, build a library, track reading progress, keep
bookmarks and a wishlist, and rate and review titles they have access to. An
admin uploads titles and sees revenue/engagement analytics and moderates
reviews.

- Stack: Next.js 16 (App Router) + TypeScript + Prisma 6 + PostgreSQL +
  Auth.js v5 + Razorpay (mock gateway in dev) + local disk storage in dev.
  Tailwind v4 + shadcn (Base UI). pdf.js for the reader.
- Read these first: `docs/BUILD-PLAN.md` (what is built and what is deliberately
  deferred), `docs/ARCHITECTURE.md`, `docs/srs_extract.txt` (FR-9, FR-10, FR-12,
  FR-13, FR-14 are the relevant requirements).

## Environment setup

Node 20+, Docker Desktop running.

1. `npm install`
2. `cp .env.example .env` (dev defaults are fine: mock/local/stub/console drivers).
3. `docker compose up -d`, then `npm run db:migrate` and `npm run db:seed`.
   - Postgres is published on host port **5544**, not 5432. The `.env` string
     already uses 5544. `P1000` auth errors mean something is pointing at 5432.
4. `npm run dev` (examples below assume `http://localhost:4600`; adjust if you
   run a different port).

Seeded state: one admin (`admin@ratishoriginals.local` / `ChangeMe-Admin-123456`),
one reader (`reader@example.com` / `NewReaderPass-99999`), one published title
("The Sample Book", 12 pages, 4 sample pages, INR 199), one membership plan
("Premium Reader", INR 2900 / 365 days). Register more readers via `POST
/api/register`. There are no purchases, memberships, reviews, or views seeded -
create your own.

Checks to run: `npx tsc --noEmit`, `npm run lint`, `npx vitest run`. For `npm run
build`, STOP the dev server first (a Turbopack build while `next dev` is live
corrupts the shared `.next` and throws phantom "module not found" - a dev-tooling
quirk, not a product bug).

## Getting authenticated sessions (Auth.js v5)

Use a cookie jar with curl. Grab a CSRF token, then post credentials:

```bash
BASE=http://localhost:4600
JAR=./jar.txt
CSRF=$(curl -s -c "$JAR" "$BASE/api/auth/csrf" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s).csrfToken))")
curl -s -b "$JAR" -c "$JAR" -X POST "$BASE/api/auth/callback/credentials" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data-urlencode "csrfToken=$CSRF" --data-urlencode "email=reader@example.com" \
  --data-urlencode "password=NewReaderPass-99999" --data-urlencode "callbackUrl=$BASE"
# reuse -b "$JAR" on later requests
```

Inspect the DB directly:
`docker exec ratishoriginals-postgres psql -U ratishoriginals -d ratishoriginals -c "SELECT ..."`

To give a reader access for testing, insert a COMPLETED `Purchase` row, or an
ACTIVE `UserMembership` plus a `MembershipDocument` linking the plan to the
title. Entitlement is defined in `src/lib/entitlements.ts`.

## Attack the highest-risk areas first

Access control, IDOR, and stored XSS are where these features can hurt. A review
renders attacker-controlled text on a public page; progress/bookmark/vote
endpoints take ids in the URL and body.

### 1. Reading progress, bookmarks, wishlist (Step 7, FR-9/10/13)

Files: `src/app/api/documents/[id]/progress/route.ts`,
`src/app/api/documents/[id]/bookmarks/route.ts`,
`src/app/api/wishlist/route.ts`, `src/lib/reading.ts`, `src/lib/library.ts`,
`src/app/library/page.tsx`, `src/app/wishlist/page.tsx`,
`src/components/reader/pdf-reader.tsx`.

- Progress: can a user save progress for a title they cannot read (should be
  403)? Try `POST /api/documents/<id>/progress` for a title you have not bought
  or subscribed to, for a DRAFT id, and unauthenticated (401). Try to force an
  out-of-range resume point: negative, zero, fractional, and `page` far beyond
  the document length; confirm `computeProgress` clamps it (1..pageCount) and
  derives completion server-side, never trusting a client completion figure.
- Bookmarks: create a bookmark without access (403), on a draft, unauthenticated.
  Can you read ANOTHER user's bookmarks via `GET`? Can you delete another user's
  bookmark by guessing its id (`DELETE` with a `bookmarkId` that is not yours)?
  The delete must be scoped to the caller and the document. Probe the page clamp
  and the one-bookmark-per-page upsert.
- Wishlist: can you wishlist a DRAFT or non-existent title? Is add/remove
  idempotent (no duplicate rows, no error on double add/remove)? Unauthenticated
  should 401.
- Library: does `/library` ever show a title the user cannot actually read? The
  "From your membership" section must disappear when a membership lapses (force
  `UserMembership.expiresAt` into the past and reload). Confirm an owned title
  that is also in a membership plan appears once (owned wins), and that progress
  percentages and the continue-reading rail cannot be driven by another user.

### 2. Analytics and view counting (Step 8, FR-14)

Files: `src/app/api/documents/[id]/view/route.ts`,
`src/components/store/view-beacon.tsx`, `src/lib/analytics.ts`,
`src/app/admin/analytics/page.tsx`, `src/app/admin/audit/page.tsx`,
`src/app/admin/page.tsx`, `src/lib/membership.ts` (amount at activation).

- View inflation: `POST /api/documents/<id>/view` is public. Confirm a draft and
  an admin session are NOT counted, and the per-IP+title cap actually holds. Try
  to bypass the cap by spoofing `X-Forwarded-For` / `x-real-ip` (see
  `src/lib/rate-limit.ts` `clientIp`); can a single client run the view count and
  therefore conversion up arbitrarily? Is this a meaningful integrity problem for
  an internal metric, or acceptable?
- Admin-only surfaces: `/admin/analytics`, `/admin/audit`, `/admin/reviews`, and
  every `/api/admin/**` route must 401 anonymous and 403/redirect a READER.
  Verify with a reader session.
- Revenue integrity: revenue combines `Purchase.amount` (completed) and
  `UserMembership.amount` (set at activation). Can you make revenue wrong -
  negative, double-counted, or counting PENDING/failed orders? Does the 30-day
  range filter leak or hide rows incorrectly (check the boundary)? Confirm
  conversion never divides by zero (`conversionRate`).
- Audit viewer: try injection or traversal via the `action` and `page` query
  params; confirm pagination cannot be driven out of bounds and that metadata
  rendered in the table cannot inject HTML.

### 3. Reviews and ratings (Step 9, FR-12)

Files: `src/lib/reviews.ts`, `src/lib/review-admin.ts`,
`src/app/api/documents/[id]/reviews/route.ts`,
`src/app/api/reviews/[reviewId]/vote/route.ts`,
`src/app/api/admin/reviews/[reviewId]/route.ts`,
`src/components/reviews/**`, `src/app/admin/reviews/page.tsx`.

- Eligibility: can a user who has NOT purchased or subscribed submit a review
  (must be 403)? Can a visitor (401)? Can anyone review a DRAFT title? After a
  membership expires, can a member still post a NEW review? Confirm eligibility
  is re-checked on the server at submit time, not just in the UI.
- Verified badges: the client sends only rating/title/text/spoiler. Confirm the
  server sets `isVerifiedPurchase` / `isVerifiedMember` from real access and that
  a client cannot forge a verified badge by adding fields to the request.
- One per user + edit trail: confirm one review per (user, title) and that each
  edit writes a `ReviewEdit` snapshot of the previous version (the audit trail).
  Can you edit or delete someone else's review? Can you create a second review by
  racing two concurrent POSTs (the model has a unique constraint - verify it
  holds)?
- **Stored XSS**: put `<script>`, `<img onerror>`, and HTML into the review
  title, review body, and (as admin) the public reply, then load the book page
  and `/admin/reviews`. Confirm React escaping neutralises all of it. This is the
  single highest-value thing to check here.
- Votes: `POST /api/reviews/<id>/vote`. Confirm a reader cannot vote on their own
  review (400), cannot vote on a hidden review, and cannot inflate a count by
  repeating the vote (unique per reviewer; counts are recomputed from rows, so
  they must never exceed the number of distinct voters). Try voting on a
  non-existent id, and toggling (same vote twice / null clears).
- Moderation: `/api/admin/reviews/<id>` (PATCH hide/restore/pin/unpin/reply,
  DELETE) must be admin-only. Confirm a hidden review disappears from the public
  list AND from the public average/distribution and analytics, and that delete
  cascades votes and edits. Try an invalid `action`.
- Spoiler handling: a spoiler review is visually collapsed client-side. Note that
  the text is still delivered in the DOM (a UX deterrent, not confidentiality) -
  flag only if that is presented as a security control.
- Display integrity: rating distribution and average must reflect only visible
  reviews; the reader display name is trimmed to a first name + initial
  (`displayName`) - confirm no full email or PII leaks into the public page or
  the API responses.

### 4. General

- Any endpoint that 500s on malformed input instead of validating (send junk
  bodies, wrong types, missing fields to every route above).
- IDOR sweep: every route that takes an id in the path or body - progress,
  bookmarks, wishlist, view, reviews, vote, admin review - tried with another
  user's / another document's id.
- Secrets in the client bundle; verbose errors leaking internals.

## Deliberate deviations and not-yet-built (do not report these as bugs)

- Dev drivers are mocks (payments/storage/email/scan). Real providers swap in by
  env var. Only PDF uploads are accepted in dev.
- Reader-side "report abusive review" is intentionally deferred to Phase 2;
  admins can already hide/delete. AI spam/toxicity detection is an explicit
  future feature.
- Production security headers and a strict CSP (removing `script-src
  'unsafe-inline'`) are deferred to Step 10 and validated there against the live
  Razorpay checkout; the CSP is prod-only. Do not report the dev CSP.
- Review analytics intentionally ship as tiles + tables with no time-series
  chart. Coupon analytics show redemption counts, not discount-money totals (no
  per-redemption discount is stored). Revenue is summed assuming a single
  currency (INR) in dev.
- "Views" are raw non-admin book-page views recorded by a client beacon (so link
  prefetches do not inflate them), with a light per-IP cap; they are not deduped
  per unique visitor. Flag only if entitlement or an integrity boundary is
  broken, not the rawness itself.
- Reading history is intentionally folded into per-card progress on the library
  rather than a separate history log (owner decision).
- The protected reader canvas cannot be screenshotted in a headless or hidden
  browser (requestAnimationFrame is throttled there, stalling canvas paint).
  Verify reader logic (progress save, resume, bookmarks, the entitlement gate)
  via the DOM and the API, not pixels.

## What to deliver

1. A ranked findings list (Critical / High / Medium / Low / Nit). For each:
   `file:line`, a one-line claim, a CONCRETE reproduction (exact requests, curl,
   inputs, or click steps), expected vs actual, and a suggested fix. Mark each
   CONFIRMED (reproduced) or THEORETICAL.
2. Separate sections for security findings, functional QA failures, and SRS
   conformance gaps (FR-9/10/12/13/14) that are genuinely missing rather than
   deferred.
3. Results of `npx tsc --noEmit`, `npm run lint`, `npx vitest run`, and a build
   (dev server stopped).
4. An overall risk assessment for the reader-engagement and reviews surface.

Be rigorous and adversarial, but do not invent nitpicks or flag the deliberate
decisions above. Real, reproducible problems only.
