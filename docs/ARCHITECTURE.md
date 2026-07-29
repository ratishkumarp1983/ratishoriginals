# Architecture

## Overview

Ratish Originals is a single Next.js 16 (App Router) application: Server Components and
Route Handlers on the server, a thin React client for interactivity. Prisma
talks to PostgreSQL. All external I/O (storage, payments, virus scan, email)
goes through **adapters** so the platform runs locally with zero paid
credentials and swaps to real providers by changing one env var each.

```
Browser
  → Next.js (Server Components + Route Handlers)
      → Prisma → PostgreSQL
      → StorageAdapter  (local disk | Cloudflare R2)
      → PaymentsAdapter (mock | Razorpay)
      → ScanAdapter     (stub | ClamAV)
      → EmailAdapter    (console | Resend)
      → Redis (rate limiting / cache)
```

## Directory layout

```
prisma/
  schema.prisma        # full data model (SRS §10 + future/audit tables)
  seed.ts              # admin + metadata + membership bootstrap
src/
  app/                 # routes (App Router)
  lib/
    env.ts             # zod-validated environment access (server only)
    prisma.ts          # Prisma client singleton
    password.ts        # Argon2id hashing
    audit.ts           # append-only audit trail helper
    adapters/
      storage/         # StorageAdapter: types, local, r2, index
      payments/        # PaymentsAdapter: types, mock, razorpay, index
      scan/            # ScanAdapter: stub | clamav
      email/           # EmailAdapter: console | resend
tests/                 # Vitest unit tests
```

Each adapter folder exposes a single factory (`storage()`, `payments()`,
`scanner()`, `email()`) returning a driver chosen by env, memoised as a
singleton. Application code depends only on the interface in `types.ts`.

## Security model (SRS §8)

- **No original object URLs ever reach a client.** App code holds opaque
  storage keys. To serve bytes we either read them server-side or issue a
  short-lived signed URL (default 30 s). The local driver's "signed URL" points
  at an authenticated app route that verifies an HMAC token **and** the caller's
  entitlement before streaming — so even dev enforces the rule.
- **Server-side authorization only.** Entitlement (purchase / membership / admin
  grant) is checked on the server for every protected read. Nothing the client
  asserts is trusted.
- **Payments are webhook-verified.** Access is granted only after a server-side
  verified Razorpay webhook or signature check (HMAC-SHA256). The mock gateway
  uses the identical verification path, so dev and prod exercise the same code.
- **Passwords** are Argon2id (`@node-rs/argon2`, prebuilt binaries — no Windows
  build toolchain). Policy (12-char min) is enforced at the validation layer.
- **Audit trail** (`lib/audit.ts`) records uploads, deletes, purchases,
  membership changes, and admin actions; best-effort so it never breaks the
  primary operation.

## Money

Amounts are stored as `Decimal(10,2)`. At the payment boundary they convert to
the smallest currency unit (paise/cents) to match Razorpay and avoid
floating-point errors. Default currency INR, configurable per document.

## Multi-author readiness (SRS §15)

`Author` exists now; `Document.authorId` is a nullable FK, null for the single
owner. Turning on the marketplace later means populating authors, adding
revenue-share + payout tables, and an author dashboard — no migration of
existing purchase/reading data.

## Dynamic metadata (SRS FR-3)

`MetadataDefinition` (admin-created fields) + `DocumentMetadata` (per-document
values). Only fields with an assigned value render on a document page. Adding a
field like "Reading Time" is data, not code.
