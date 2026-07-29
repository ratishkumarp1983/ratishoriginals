import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";
import { DocumentCard } from "@/components/store/document-card";

export const dynamic = "force-dynamic";

export default async function Home() {
  const docs = await prisma.document.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    take: 12,
    select: {
      id: true,
      slug: true,
      title: true,
      price: true,
      currency: true,
      coverImage: true,
    },
  });

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <section className="mb-12 max-w-2xl space-y-3">
        <h1 className="text-4xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
          Original writing, read securely online.
        </h1>
        <p className="text-lg text-neutral-600 dark:text-neutral-400">
          Preview any title, then buy once and read it online for life.
        </p>
        <div className="flex gap-3 pt-1">
          <Link href="/browse" className={buttonVariants()}>
            Browse the catalog
          </Link>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Latest releases</h2>
          <Link href="/browse" className="text-sm text-neutral-500 hover:underline">
            View all
          </Link>
        </div>

        {docs.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-300 p-10 text-center text-neutral-500 dark:border-neutral-700">
            No titles published yet. Check back soon.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {docs.map((d) => (
              <DocumentCard
                key={d.id}
                doc={{
                  id: d.id,
                  slug: d.slug,
                  title: d.title,
                  price: d.price,
                  currency: d.currency,
                  hasCover: !!d.coverImage,
                }}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
