import { env } from "@/lib/env";

/**
 * Foundation landing page. This is a placeholder for Step 1 - it renders the
 * brand and a live view of which service adapters are active, so the wiring is
 * verifiable at a glance. The real storefront arrives in later steps.
 */
export default function Home() {
  const adapters: { label: string; value: string; live: boolean }[] = [
    { label: "Database", value: "PostgreSQL / Prisma", live: true },
    {
      label: "Storage",
      value: env.STORAGE_DRIVER === "r2" ? "Cloudflare R2" : "Local disk (dev)",
      live: env.STORAGE_DRIVER === "r2",
    },
    {
      label: "Payments",
      value:
        env.PAYMENTS_DRIVER === "razorpay" ? "Razorpay" : "Mock gateway (dev)",
      live: env.PAYMENTS_DRIVER === "razorpay",
    },
    {
      label: "Virus scan",
      value: env.SCAN_DRIVER === "clamav" ? "ClamAV" : "Stub (dev)",
      live: env.SCAN_DRIVER === "clamav",
    },
    {
      label: "Email",
      value: env.EMAIL_DRIVER === "resend" ? "Resend" : "Console (dev)",
      live: env.EMAIL_DRIVER === "resend",
    },
    {
      label: "Google SSO",
      value: env.AUTH_GOOGLE_ID ? "Configured" : "Not configured",
      live: !!env.AUTH_GOOGLE_ID,
    },
  ];

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center gap-10 px-6 py-16">
      <header className="space-y-3">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-neutral-500">
          {env.APP_NAME}
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
          A premium platform for original writing.
        </h1>
        <p className="max-w-xl text-lg text-neutral-600 dark:text-neutral-400">
          Discover, preview, purchase, and read original works securely online.
          The foundation is in place - authentication, the storefront, and the
          protected reader are being built in phases.
        </p>
      </header>

      <section className="rounded-xl border border-neutral-200 bg-white/50 p-6 dark:border-neutral-800 dark:bg-neutral-900/40">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Service configuration
        </h2>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
          {adapters.map((a) => (
            <div
              key={a.label}
              className="flex items-center justify-between gap-4 border-b border-neutral-100 py-1.5 dark:border-neutral-800"
            >
              <dt className="text-neutral-600 dark:text-neutral-400">
                {a.label}
              </dt>
              <dd className="flex items-center gap-2 text-sm font-medium text-neutral-900 dark:text-neutral-100">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${
                    a.live ? "bg-emerald-500" : "bg-amber-400"
                  }`}
                  aria-hidden
                />
                {a.value}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-neutral-500">
          <span className="text-amber-500">●</span> development driver ·{" "}
          <span className="text-emerald-500">●</span> production provider
        </p>
      </section>
    </main>
  );
}
