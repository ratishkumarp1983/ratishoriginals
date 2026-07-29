"use client";

import { useState } from "react";
import Link from "next/link";

type Vote = "HELPFUL" | "NOT_HELPFUL" | null;

/**
 * Helpful / not-helpful voting on a review (SRS FR-12). Own reviews show counts
 * only; signed-out readers are sent to sign in; everyone else votes (toggle).
 */
export function HelpfulVotes({
  reviewId,
  helpful,
  notHelpful,
  viewerVote,
  isOwn,
  isAuthenticated,
  signInHref,
}: {
  reviewId: string;
  helpful: number;
  notHelpful: number;
  viewerVote: Vote;
  isOwn: boolean;
  isAuthenticated: boolean;
  signInHref: string;
}) {
  const [h, setH] = useState(helpful);
  const [nh, setNh] = useState(notHelpful);
  const [vote, setVote] = useState<Vote>(viewerVote);
  const [busy, setBusy] = useState(false);

  const send = async (type: "HELPFUL" | "NOT_HELPFUL") => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/reviews/${reviewId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voteType: vote === type ? null : type }),
      });
      if (res.ok) {
        const d = (await res.json()) as { helpfulCount: number; notHelpfulCount: number; viewerVote: Vote };
        setH(d.helpfulCount);
        setNh(d.notHelpfulCount);
        setVote(d.viewerVote);
      }
    } finally {
      setBusy(false);
    }
  };

  if (isOwn) {
    return (
      <p className="mt-3 text-xs text-neutral-400">
        {h} found this helpful
      </p>
    );
  }

  const base =
    "rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-50";
  const on = "border-brand-gold bg-brand-gold/10 text-brand-navy dark:text-brand-gold";
  const off = "border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800";

  if (!isAuthenticated) {
    return (
      <div className="mt-3 flex items-center gap-2">
        <Link href={signInHref} className={`${base} ${off}`}>
          Helpful ({h})
        </Link>
        <Link href={signInHref} className={`${base} ${off}`}>
          Not helpful ({nh})
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-3 flex items-center gap-2">
      <button
        onClick={() => void send("HELPFUL")}
        disabled={busy}
        aria-pressed={vote === "HELPFUL"}
        className={`${base} ${vote === "HELPFUL" ? on : off}`}
      >
        Helpful ({h})
      </button>
      <button
        onClick={() => void send("NOT_HELPFUL")}
        disabled={busy}
        aria-pressed={vote === "NOT_HELPFUL"}
        className={`${base} ${vote === "NOT_HELPFUL" ? on : off}`}
      >
        Not helpful ({nh})
      </button>
    </div>
  );
}
