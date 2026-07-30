/**
 * Server-side Sentry init (SRS §14 observability), env-gated: with no SENTRY_DSN
 * the SDK is never imported or initialised, so there is zero overhead and no
 * network calls when monitoring is off.
 */
export async function register() {
  if (!process.env.SENTRY_DSN) return;
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV,
      tracesSampleRate: 0.1,
    });
  }
}

export async function onRequestError(
  ...args: Parameters<
    NonNullable<Awaited<typeof import("@sentry/nextjs")>["captureRequestError"]>
  >
) {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(...args);
}
