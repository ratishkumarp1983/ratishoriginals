"use client";

import { useState } from "react";

/**
 * A book cover that always looks intentional. It renders a styled panel
 * (deterministic deep tone + serif title) and overlays the real cover image
 * only once it loads at a usable size, so placeholder or missing art never
 * shows an empty box.
 */
const PALETTE = [
  "#16293b", // navy
  "#3a2b1a", // espresso
  "#2a2140", // aubergine
  "#1e3230", // pine
  "#3a1f28", // wine
  "#22364a", // slate blue
];

function pick(title: string): string {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function BookCover({
  documentId,
  title,
  author = "Ratish Kumar",
  className = "",
  titleClass = "text-base",
}: {
  documentId: string;
  title: string;
  author?: string;
  className?: string;
  titleClass?: string;
}) {
  const [showImage, setShowImage] = useState(false);
  const bg = pick(title);

  return (
    <div
      className={`relative flex flex-col justify-between overflow-hidden ${className}`}
      style={{ backgroundColor: bg }}
    >
      <span className="p-4 text-[11px] font-medium uppercase tracking-[0.15em] text-brand-gold">
        Ratish Originals
      </span>
      <div className="px-4 pb-5">
        <p
          className={`font-display font-semibold leading-tight text-white ${titleClass}`}
        >
          {title}
        </p>
        <p className="mt-1 text-[11px] uppercase tracking-widest text-brand-gold/90">
          {author}
        </p>
      </div>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/documents/${documentId}/cover`}
        alt=""
        aria-hidden
        className={`absolute inset-0 h-full w-full object-cover transition-opacity ${
          showImage ? "opacity-100" : "opacity-0"
        }`}
        onLoad={(e) => {
          if (e.currentTarget.naturalWidth >= 40) setShowImage(true);
        }}
        onError={() => setShowImage(false)}
      />
    </div>
  );
}
