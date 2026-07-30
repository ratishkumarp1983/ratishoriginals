import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";

// Generated per request, not at build time: the sitemap queries the database,
// which must not be a build-time dependency (the CI build has no real DB).
export const dynamic = "force-dynamic";

/** Sitemap of static pages plus every published document (SRS §13). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.APP_URL.replace(/\/$/, "");

  const docs = await prisma.document.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true, updatedAt: true },
    orderBy: { publishedAt: "desc" },
    take: 5000,
  });

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: "daily", priority: 1 },
    { url: `${base}/browse`, changeFrequency: "daily", priority: 0.8 },
  ];

  const docPages: MetadataRoute.Sitemap = docs.map((d) => ({
    url: `${base}/book/${d.slug}`,
    lastModified: d.updatedAt,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticPages, ...docPages];
}
