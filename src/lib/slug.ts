import { prisma } from "@/lib/prisma";

/** Convert an arbitrary title to a URL-safe slug. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "") || "document";
}

/**
 * A slug unique across documents. If the base is taken, append -2, -3, …
 * `excludeId` lets an update keep its own slug.
 */
export async function uniqueDocumentSlug(
  title: string,
  excludeId?: string,
): Promise<string> {
  const base = slugify(title);
  let candidate = base;
  let n = 1;
  // Bounded loop; collisions are rare.
  for (;;) {
    const existing = await prisma.document.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeId) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}
