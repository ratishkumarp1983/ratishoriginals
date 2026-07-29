"use client";

import { useState } from "react";

/** Collapses a spoiler-tagged review until the reader chooses to reveal it. */
export function SpoilerBody({ text, spoiler }: { text: string; spoiler: boolean }) {
  const [show, setShow] = useState(!spoiler);

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="mt-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300"
      >
        This review contains spoilers. Show anyway.
      </button>
    );
  }

  return (
    <p className="mt-2 whitespace-pre-line text-sm text-neutral-700 dark:text-neutral-300">
      {text}
    </p>
  );
}
