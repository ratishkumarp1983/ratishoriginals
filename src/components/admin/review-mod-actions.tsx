"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** Admin moderation controls for one review (SRS FR-12). */
export function ReviewModActions({
  reviewId,
  isVisible,
  isPinned,
  adminReply,
}: {
  reviewId: string;
  isVisible: boolean;
  isPinned: boolean;
  adminReply: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [reply, setReply] = useState(adminReply ?? "");

  const act = async (action: string, extra?: Record<string, unknown>) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm("Delete this review permanently?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/reviews/${reviewId}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const btn =
    "rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-1.5">
        <button className={btn} disabled={busy} onClick={() => act(isVisible ? "hide" : "restore")}>
          {isVisible ? "Hide" : "Restore"}
        </button>
        <button className={btn} disabled={busy} onClick={() => act(isPinned ? "unpin" : "pin")}>
          {isPinned ? "Unpin" : "Pin"}
        </button>
        <button className={btn} disabled={busy} onClick={() => setReplyOpen((o) => !o)}>
          {adminReply ? "Edit reply" : "Reply"}
        </button>
        <button
          className={`${btn} hover:text-red-600`}
          disabled={busy}
          onClick={() => void remove()}
        >
          Delete
        </button>
      </div>

      {replyOpen && (
        <div className="flex flex-col gap-1.5">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            rows={2}
            maxLength={2000}
            placeholder="Public response as Ratish Originals"
            className="w-full rounded-md border border-neutral-300 bg-transparent px-2 py-1 text-xs dark:border-neutral-700"
          />
          <div className="flex gap-1.5">
            <button
              className={btn}
              disabled={busy}
              onClick={() => act("reply", { reply }).then(() => setReplyOpen(false))}
            >
              Save reply
            </button>
            {adminReply && (
              <button
                className={btn}
                disabled={busy}
                onClick={() => {
                  setReply("");
                  act("reply", { reply: "" }).then(() => setReplyOpen(false));
                }}
              >
                Remove reply
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
