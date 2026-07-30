import * as Sentry from "@sentry/nextjs";

/**
 * Browser-side Sentry init (env-gated). With no NEXT_PUBLIC_SENTRY_DSN the SDK
 * never initialises and makes no calls. Session replay is off so the CSP needs
 * no extra worker/blob allowances for it.
 */
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT || undefined,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
