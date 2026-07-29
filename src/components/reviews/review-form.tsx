"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

interface Existing {
  rating: number;
  title: string | null;
  review: string;
  containsSpoiler: boolean;
}

/**
 * Create / edit / delete the reader's own review (SRS FR-12). Only rendered for
 * a reader who is eligible (owns or subscribes to the title); the server
 * re-checks eligibility on submit regardless.
 */
export function ReviewForm({
  documentId,
  initial,
}: {
  documentId: string;
  initial: Existing | null;
}) {
  const router = useRouter();
  const [rating, setRating] = useState(initial?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [text, setText] = useState(initial?.review ?? "");
  const [spoiler, setSpoiler] = useState(initial?.containsSpoiler ?? false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const editing = !!initial;

  const submit = async () => {
    if (rating < 1) return setError("Choose a star rating.");
    if (!text.trim()) return setError("Write a few words.");
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, title: title.trim() || undefined, review: text.trim(), containsSpoiler: spoiler }),
      });
      if (!res.ok) {
        const d = (await res.json().catch(() => ({}))) as { error?: string };
        setError(d.error ?? "Could not save your review.");
      } else {
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/reviews`, { method: "DELETE" });
      if (res.ok) {
        setRating(0);
        setTitle("");
        setText("");
        setSpoiler(false);
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
      <h3 className="text-sm font-semibold">{editing ? "Your review" : "Write a review"}</h3>

      <div className="mt-3 flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => setRating(i)}
            onMouseEnter={() => setHover(i)}
            aria-label={`${i} star${i === 1 ? "" : "s"}`}
            className={`text-2xl leading-none ${
              i <= (hover || rating) ? "text-brand-gold" : "text-neutral-300 dark:text-neutral-700"
            }`}
          >
            ★
          </button>
        ))}
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (optional)"
        maxLength={120}
        className="mt-3 w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
      />
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Share what you thought."
        rows={4}
        maxLength={5000}
        className="mt-2 w-full rounded-md border border-neutral-300 bg-transparent px-3 py-2 text-sm dark:border-neutral-700"
      />
      <label className="mt-2 flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
        <input type="checkbox" checked={spoiler} onChange={(e) => setSpoiler(e.target.checked)} />
        This review contains spoilers
      </label>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      <div className="mt-3 flex items-center gap-2">
        <Button onClick={() => void submit()} disabled={busy}>
          {editing ? "Update review" : "Post review"}
        </Button>
        {editing && (
          <button
            onClick={() => void remove()}
            disabled={busy}
            className="text-sm text-neutral-400 hover:text-red-600"
          >
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
