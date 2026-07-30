import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

/**
 * robots.txt (SRS §13 SEO). Public storefront is crawlable; private and
 * transactional areas are disallowed. In production APP_URL must be the real
 * origin so the sitemap link is correct.
 */
export default function robots(): MetadataRoute.Robots {
  const base = env.APP_URL.replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api", "/read", "/library", "/wishlist", "/account", "/checkout"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
