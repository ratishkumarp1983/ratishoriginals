"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";

/**
 * Product analytics (PostHog), env-gated and bundled from npm (no external
 * <script> tag) so the strict nonce CSP holds. With no NEXT_PUBLIC_POSTHOG_KEY
 * it initialises nothing and just renders its children.
 */
const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
let initialised = false;

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!key || typeof window === "undefined" || initialised) return;
    initialised = true;
    posthog.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      capture_pageview: true,
      capture_pageleave: true,
      person_profiles: "identified_only",
    });
  }, []);

  if (!key) return <>{children}</>;
  return <PHProvider client={posthog}>{children}</PHProvider>;
}
