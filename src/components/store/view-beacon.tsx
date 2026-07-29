"use client";

import { useEffect, useRef } from "react";

/**
 * Records one storefront view (SRS FR-14) when the book page actually mounts in
 * a browser. Because it runs in a client effect, a Next.js link prefetch (which
 * renders the server component but never runs effects) does not count as a view.
 */
export function ViewBeacon({ documentId }: { documentId: string }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    fetch(`/api/documents/${documentId}/view`, {
      method: "POST",
      keepalive: true,
    }).catch(() => {
      // A missed view is harmless; never disrupt the page.
    });
  }, [documentId]);
  return null;
}
