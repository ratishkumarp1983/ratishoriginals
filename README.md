# Ratish Originals (RatishOriginals)

A premium, secure digital publishing and reading platform. An author publishes,
protects, markets, and monetises written works through an online reading
experience. Single-author today; architected for a multi-author marketplace
tomorrow.

Built to the SRS at [`docs/RatishOriginals-SRS.docx`](docs/RatishOriginals-SRS.docx).

## Stack

- **Next.js 16** (App Router) · React 19 · TypeScript
- **Tailwind CSS v4** · shadcn/ui (added as UI is built)
- **Prisma 6** · PostgreSQL
- **Auth.js v5** (Google OAuth + email/password, Argon2id)
- **Razorpay** payments (mock gateway in dev)
- **Cloudflare R2** storage (local disk in dev)
- **Redis** (ioredis) for rate limiting / cache

> The SRS names Next.js 15; this build uses the current stable 16 (a
> backward-compatible App Router superset). See `docs/BUILD-PLAN.md` for the
> full list of deliberate deviations.

## Local-first by design

Every external service sits behind an adapter with a dev driver that needs **no
paid credentials**. Flip one env var to switch a service to its real provider:

| Service    | Dev driver          | Prod driver        | Env var           |
| ---------- | ------------------- | ------------------ | ----------------- |
| Storage    | Local disk          | Cloudflare R2      | `STORAGE_DRIVER`  |
| Payments   | In-process mock     | Razorpay           | `PAYMENTS_DRIVER` |
| Virus scan | Stub                | ClamAV             | `SCAN_DRIVER`     |
| Email      | Console             | Resend             | `EMAIL_DRIVER`    |

Postgres and Redis run locally via Docker (`docker-compose.yml`).

## Getting started

```bash
# 1. Install
npm install

# 2. Configure
cp .env.example .env        # dev defaults work as-is

# 3. Start Postgres + Redis (needs Docker Desktop running)
docker compose up -d

# 4. Create the schema and seed the admin + starter data
npm run db:migrate
npm run db:seed

# 5. Run
npm run dev                 # http://localhost:3000
```

Default admin (from `.env`): `admin@ratishoriginals.local` / `ChangeMe-Admin-123456`.

## Scripts

| Command              | Purpose                              |
| -------------------- | ------------------------------------ |
| `npm run dev`        | Dev server                           |
| `npm run build`      | Production build                     |
| `npm run test`       | Unit tests (Vitest)                  |
| `npm run db:migrate` | Create/apply a dev migration         |
| `npm run db:seed`    | Seed admin, metadata, membership     |
| `npm run db:studio`  | Prisma Studio                        |
| `npm run lint`       | ESLint                               |

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — design, adapters, security model
- [`docs/BUILD-PLAN.md`](docs/BUILD-PLAN.md) — phased plan and checkpoints
