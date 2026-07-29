import { z } from "zod";

/**
 * Central, validated environment access. Import `env` anywhere instead of
 * reading process.env directly so misconfiguration fails fast and loudly.
 *
 * Server-only. Never import this into a Client Component.
 */

const bool = (def: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v == null ? def : /^(1|true|yes|on)$/i.test(v)));

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  APP_NAME: z.string().default("Ratish Originals"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  AUTH_SECRET: z.string().min(16, "AUTH_SECRET must be at least 16 chars"),
  AUTH_TRUST_HOST: bool(true),
  AUTH_GOOGLE_ID: z.string().optional().default(""),
  AUTH_GOOGLE_SECRET: z.string().optional().default(""),

  STORAGE_DRIVER: z.enum(["local", "r2"]).default("local"),
  STORAGE_LOCAL_DIR: z.string().default(".storage"),
  STORAGE_SIGNED_URL_TTL: z.coerce.number().int().positive().default(30),
  R2_ACCOUNT_ID: z.string().optional().default(""),
  R2_ACCESS_KEY_ID: z.string().optional().default(""),
  R2_SECRET_ACCESS_KEY: z.string().optional().default(""),
  R2_BUCKET: z.string().optional().default(""),
  R2_ENDPOINT: z.string().optional().default(""),

  PAYMENTS_DRIVER: z.enum(["mock", "razorpay"]).default("mock"),
  PAYMENTS_CURRENCY: z.string().default("INR"),
  RAZORPAY_KEY_ID: z.string().optional().default(""),
  RAZORPAY_KEY_SECRET: z.string().optional().default(""),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(""),

  SCAN_DRIVER: z.enum(["stub", "clamav"]).default("stub"),
  CLAMAV_HOST: z.string().optional().default(""),
  CLAMAV_PORT: z.coerce.number().int().positive().default(3310),

  EMAIL_DRIVER: z.enum(["console", "resend"]).default("console"),
  EMAIL_FROM: z.string().default("Ratish Originals <no-reply@localhost>"),
  RESEND_API_KEY: z.string().optional().default(""),

  REDIS_URL: z.string().optional().default(""),

  TURNSTILE_SITE_KEY: z.string().optional().default(""),
  TURNSTILE_SECRET_KEY: z.string().optional().default(""),

  SENTRY_DSN: z.string().optional().default(""),

  ADMIN_EMAIL: z.string().email().default("admin@ratishoriginals.local"),
  ADMIN_PASSWORD: z.string().min(12).default("ChangeMe-Admin-123456"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(`Invalid environment configuration:\n${issues}`);
}

export const env = parsed.data;
export type Env = typeof env;

/** True when Google OAuth is fully configured. */
export const isGoogleEnabled = () =>
  !!env.AUTH_GOOGLE_ID && !!env.AUTH_GOOGLE_SECRET;

/** True when Turnstile bot-protection should be enforced. */
export const isTurnstileEnabled = () =>
  !!env.TURNSTILE_SITE_KEY && !!env.TURNSTILE_SECRET_KEY;
