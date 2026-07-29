"use client";

import { useState } from "react";
import { toast } from "sonner";

/** Email capture. Styled for the cream newsletter band on the home page. */
export function NewsletterForm({ source = "home" }: { source?: string }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch("/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, source }),
    });
    setBusy(false);
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      message?: string;
      error?: string;
    };
    if (!res.ok || !data.ok) {
      toast.error(data.error ?? "Could not subscribe.");
      return;
    }
    setDone(true);
    toast.success(data.message ?? "You are on the list.");
  }

  if (done) {
    return (
      <p className="text-sm text-brand-navy/70">
        You are on the list. Check your inbox for a welcome note and your free
        chapter.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex w-full max-w-md flex-col gap-3 sm:flex-row">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email address"
        aria-label="Email address"
        className="h-11 flex-1 rounded-md border border-brand-navy/20 bg-white px-4 text-sm text-brand-ink outline-none focus:border-brand-navy"
      />
      <button
        type="submit"
        disabled={busy}
        className="h-11 shrink-0 rounded-md bg-brand-navy px-6 text-sm font-medium text-white transition-colors hover:bg-brand-navy-2 disabled:opacity-60"
      >
        {busy ? "Subscribing..." : "Subscribe"}
      </button>
    </form>
  );
}
