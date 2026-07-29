import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { DocumentCard } from "@/components/store/document-card";
import { SearchBar } from "@/components/store/search-bar";

export const metadata: Metadata = { title: "Browse" };
export const dynamic = "force-dynamic";

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  // Search by title, description, and any assigned metadata value (FR-11).
  // Category/tags/series/language live in the dynamic metadata system, so a
  // metadata-value match covers them.
  const where: Prisma.DocumentWhereInput = {
    status: "PUBLISHED",
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: "insensitive" } },
            { description: { contains: query, mode: "insensitive" } },
            {
              metadata: {
                some: { value: { contains: query, mode: "insensitive" } },
              },
            },
          ],
        }
      : {}),
  };

  const docs = await prisma.document.findMany({
    where,
    orderBy: { publishedAt: "desc" },
    take: 60,
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
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
      <div className="mb-8 space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">Browse</h1>
        <SearchBar initial={query} />
        {query && (
          <p className="text-sm text-neutral-500">
            {docs.length} result{docs.length === 1 ? "" : "s"} for &ldquo;{query}
            &rdquo;
          </p>
        )}
      </div>

      {docs.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-10 text-center text-neutral-500 dark:border-neutral-700">
          {query ? "No titles match your search." : "No titles published yet."}
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
    </main>
  );
}
