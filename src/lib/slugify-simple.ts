import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slug";

/** A membership slug unique across plans. */
export async function uniqueMembershipSlug(name: string): Promise<string> {
  const base = slugify(name);
  let candidate = base;
  let n = 1;
  for (;;) {
    const existing = await prisma.membership.findUnique({
      where: { slug: candidate },
      select: { id: true },
    });
    if (!existing) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}
