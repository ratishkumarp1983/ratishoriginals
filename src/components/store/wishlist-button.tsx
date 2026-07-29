"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";

/**
 * Save / unsave a title (SRS FR-13). Signed-out readers get a sign-in link;
 * signed-in readers toggle optimistically against /api/wishlist.
 */
export function WishlistButton({
  documentId,
  initialWishlisted,
  isAuthenticated,
  signInHref,
  size = "lg",
}: {
  documentId: string;
  initialWishlisted: boolean;
  isAuthenticated: boolean;
  signInHref: string;
  size?: "default" | "sm" | "lg";
}) {
  const [saved, setSaved] = useState(initialWishlisted);
  const [pending, startTransition] = useTransition();

  if (!isAuthenticated) {
    return (
      <Link href={signInHref} className={buttonVariants({ variant: "outline", size })}>
        Save for later
      </Link>
    );
  }

  const toggle = () => {
    const next = !saved;
    setSaved(next); // optimistic
    startTransition(async () => {
      try {
        const res = await fetch("/api/wishlist", {
          method: next ? "POST" : "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ documentId }),
        });
        if (!res.ok) setSaved(!next); // revert on failure
      } catch {
        setSaved(!next);
      }
    });
  };

  return (
    <Button variant="outline" size={size} onClick={toggle} disabled={pending} aria-pressed={saved}>
      {saved ? "Saved ✓" : "Save for later"}
    </Button>
  );
}
