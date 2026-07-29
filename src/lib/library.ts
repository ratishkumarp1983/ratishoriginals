import { prisma } from "@/lib/prisma";

/**
 * Reader library (SRS FR-9). Assembles what a reader can open, split into
 * titles they own for life (completed purchases) and titles they can read only
 * while their membership is active, with reading progress (FR-10) merged in.
 * "Continue reading" is the in-progress slice across both, most recent first;
 * per-card progress is how "reading history" surfaces (owner-approved: folded
 * into the library rather than a separate log).
 */
export interface LibraryItem {
  documentId: string;
  slug: string;
  title: string;
  coverImage: string | null;
  pageCount: number | null;
  lastPage: number;
  completionPercent: number;
  lastReadAt: Date | null;
}

export interface Library {
  owned: LibraryItem[];
  membership: LibraryItem[];
  continueReading: LibraryItem[];
}

interface DocRow {
  id: string;
  slug: string;
  title: string;
  coverImage: string | null;
  pageCount: number | null;
}

const CONTINUE_LIMIT = 8;

export async function getLibrary(userId: string): Promise<Library> {
  const now = new Date();

  const [purchases, activeMemberships, progressRows] = await Promise.all([
    prisma.purchase.findMany({
      where: { userId, status: "COMPLETED" },
      select: { document: { select: docSelect } },
    }),
    prisma.userMembership.findMany({
      where: {
        userId,
        status: "ACTIVE",
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      select: { membershipId: true },
    }),
    prisma.readingProgress.findMany({
      where: { userId },
      select: { documentId: true, lastPage: true, completionPercent: true, updatedAt: true },
    }),
  ]);

  const progress = new Map(progressRows.map((p) => [p.documentId, p]));

  const ownedDocs = purchases.map((p) => p.document);
  const ownedIds = new Set(ownedDocs.map((d) => d.id));

  const planIds = [...new Set(activeMemberships.map((m) => m.membershipId))];
  const memberDocs: DocRow[] = planIds.length
    ? (
        await prisma.membershipDocument.findMany({
          where: { membershipId: { in: planIds } },
          select: { document: { select: docSelect } },
        })
      ).map((m) => m.document)
    : [];

  // Owned wins over membership, and a title included by two plans shows once.
  const seenMember = new Set<string>();
  const membershipDocs = memberDocs.filter((d) => {
    if (ownedIds.has(d.id) || seenMember.has(d.id)) return false;
    seenMember.add(d.id);
    return true;
  });

  const toItem = (d: DocRow): LibraryItem => {
    const p = progress.get(d.id);
    return {
      documentId: d.id,
      slug: d.slug,
      title: d.title,
      coverImage: d.coverImage,
      pageCount: d.pageCount,
      lastPage: p?.lastPage ?? 1,
      completionPercent: p?.completionPercent ?? 0,
      lastReadAt: p?.updatedAt ?? null,
    };
  };

  const owned = ownedDocs.map(toItem).sort(byRecent);
  const membership = membershipDocs.map(toItem).sort(byRecent);

  const continueReading = [...owned, ...membership]
    .filter((i) => i.lastReadAt && i.completionPercent > 0 && i.completionPercent < 100)
    .sort(byRecent)
    .slice(0, CONTINUE_LIMIT);

  return { owned, membership, continueReading };
}

const docSelect = {
  id: true,
  slug: true,
  title: true,
  coverImage: true,
  pageCount: true,
} as const;

/** Most recently read first; unread titles fall to the bottom by title. */
function byRecent(a: LibraryItem, b: LibraryItem): number {
  const at = a.lastReadAt?.getTime() ?? 0;
  const bt = b.lastReadAt?.getTime() ?? 0;
  if (at !== bt) return bt - at;
  return a.title.localeCompare(b.title);
}
