import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { buttonVariants } from "@/components/ui/button";
import { BookCover } from "@/components/store/book-cover";

export const metadata: Metadata = { title: "Library" };
export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const user = await requireUser("/library");

  const purchases = await prisma.purchase.findMany({
    where: { userId: user.id, status: "COMPLETED" },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      document: {
        select: { id: true, slug: true, title: true, coverImage: true },
      },
    },
  });

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Your library</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Titles you own, yours to read online for life.
      </p>

      {purchases.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <p className="text-neutral-500">You have not bought any titles yet.</p>
          <Link href="/browse" className={buttonVariants({ className: "mt-4" })}>
            Browse the catalog
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {purchases.map((p) => (
            <Link
              key={p.id}
              href={`/read/${p.document.slug}`}
              className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200 transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700"
            >
              <BookCover
                documentId={p.document.id}
                title={p.document.title}
                className="aspect-[3/4]"
              />
              <div className="flex flex-1 flex-col gap-1 p-3">
                <h3 className="line-clamp-2 text-sm font-medium">{p.document.title}</h3>
                <span className="mt-auto text-xs text-neutral-500 group-hover:underline">
                  Read now
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
