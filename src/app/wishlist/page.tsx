import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { formatPrice, isFree } from "@/lib/format";
import { WishlistGrid, type WishlistCard } from "@/components/store/wishlist-grid";

export const metadata: Metadata = { title: "Saved for later" };
export const dynamic = "force-dynamic";

export default async function WishlistPage() {
  const user = await requireUser("/wishlist");

  const saved = await prisma.wishlist.findMany({
    where: { userId: user.id, document: { status: "PUBLISHED" } },
    orderBy: { createdAt: "desc" },
    select: {
      document: {
        select: { id: true, slug: true, title: true, price: true, currency: true },
      },
    },
  });

  // Flag titles the reader already owns so the card reads "In your library".
  const ownedIds = new Set(
    (
      await prisma.purchase.findMany({
        where: {
          userId: user.id,
          status: "COMPLETED",
          documentId: { in: saved.map((s) => s.document.id) },
        },
        select: { documentId: true },
      })
    ).map((p) => p.documentId),
  );

  const items: WishlistCard[] = saved.map((s) => ({
    documentId: s.document.id,
    slug: s.document.slug,
    title: s.document.title,
    priceLabel: isFree(s.document.price)
      ? "Free"
      : formatPrice(s.document.price, s.document.currency),
    owned: ownedIds.has(s.document.id),
  }));

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Saved for later</h1>
          <p className="mt-1 text-sm text-neutral-500">Titles you want to come back to.</p>
        </div>
        <Link href="/library" className="text-sm font-medium underline">
          Your library
        </Link>
      </div>
      <WishlistGrid initial={items} />
    </main>
  );
}
