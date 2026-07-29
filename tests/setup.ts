// Vitest global setup. Provide the minimum env the modules under test read,
// so importing `@/lib/env` succeeds without a real .env in CI.
const e = process.env as Record<string, string | undefined>;
e.NODE_ENV ??= "test";
e.DATABASE_URL ??=
  "postgresql://ratishoriginals:ratishoriginals@localhost:5544/ratishoriginals?schema=public";
e.AUTH_SECRET ??= "test-secret-0123456789abcdef";
e.APP_URL ??= "http://localhost:3000";
