import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of service" };

export default function TermsPage() {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <h1 className="font-display text-2xl font-semibold">Terms of service</h1>
      <p className="mt-4 text-neutral-600 dark:text-neutral-400">
        The full terms of service are being finalized and will appear here
        before launch.
      </p>
    </main>
  );
}
