"use client";

import { useState } from "react";
import Link from "next/link";
import { BookCover } from "@/components/store/book-cover";

export interface WishlistCard {
  documentId: string;
  slug: string;
  title: string;
  priceLabel: string;
  owned: boolean;
}

/**
 * Client grid for the wishlist so an item can vanish the moment it is removed,
 * without a full reload. Removal hits DELETE /api/wishlist and is optimistic.
 */
export function WishlistGrid({ initial }: { initial: WishlistCard[] }) {
  const [items, setItems] = useState(initial);

  const remove = async (documentId: string) => {
    const prev = items;
    setItems((cur) => cur.filter((i) => i.documentId !== documentId)); // optimistic
    try {
      const res = await fetch("/api/wishlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      });
      if (!res.ok) setItems(prev); // revert
    } catch {
      setItems(prev);
    }
  };

  if (items.length === 0) {
    return (
      <div className="mt-8 rounded-xl border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
        <p className="text-neutral-500">Nothing saved yet.</p>
        <Link href="/browse" className="mt-3 inline-block text-sm font-medium underline">
          Browse the catalog
        </Link>
      </div>
    );
  }

  return (
    <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {items.map((item) => (
        <div
          key={item.documentId}
          className="flex flex-col overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800"
        >
          <Link href={`/book/${item.slug}`} className="group">
            <BookCover documentId={item.documentId} title={item.title} className="aspect-[3/4]" />
          </Link>
          <div className="flex flex-1 flex-col gap-1 p-3">
            <Link href={`/book/${item.slug}`}>
              <h3 className="line-clamp-2 text-sm font-medium hover:underline">{item.title}</h3>
            </Link>
            <span className="text-xs text-neutral-500">
              {item.owned ? "In your library" : item.priceLabel}
            </span>
            <button
              onClick={() => void remove(item.documentId)}
              className="mt-2 self-start text-xs text-neutral-400 hover:text-red-600"
            >
              Remove
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
