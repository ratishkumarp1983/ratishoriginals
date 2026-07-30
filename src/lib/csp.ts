/**
 * Content Security Policy (SRS §8 hardening). A per-request nonce plus
 * `strict-dynamic` on script-src means only our own nonce-tagged bootstrap
 * scripts run, and scripts THEY load (Next chunks, the dynamically-injected
 * Razorpay checkout) are trusted transitively - so `'unsafe-inline'` is gone
 * from script-src. Host allowlists for analytics/error hosts are added to
 * connect-src only when those integrations are configured, keeping the policy
 * as tight as the deployment actually needs.
 *
 * style-src keeps `'unsafe-inline'`: Tailwind and Next inject inline styles and
 * nonce-ing every style is impractical; inline styles cannot execute code.
 */
export function buildCsp(nonce: string): string {
  const connect = ["'self'", "https://*.razorpay.com"];

  if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com";
    connect.push(host, "https://*.posthog.com");
  }
  if (process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN) {
    connect.push("https://*.ingest.sentry.io", "https://*.ingest.us.sentry.io");
  }

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https://checkout.razorpay.com`,
    "worker-src 'self' blob:",
    `connect-src ${connect.join(" ")}`,
    "frame-src https://*.razorpay.com https://checkout.razorpay.com",
    "upgrade-insecure-requests",
  ].join("; ");
}
