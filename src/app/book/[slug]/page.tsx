import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getReadAccess } from "@/lib/entitlements";
import { formatPrice, isFree } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";
import { BuyButton } from "@/components/store/buy-button";
import { BookCover } from "@/components/store/book-cover";
import { WishlistButton } from "@/components/store/wishlist-button";
import { ViewBeacon } from "@/components/store/view-beacon";
import { ReviewsSection } from "@/components/reviews/reviews-section";
import type { ReviewSort } from "@/lib/reviews";
import { env } from "@/lib/env";

const REVIEW_SORTS: ReviewSort[] = ["helpful", "highest", "lowest", "newest", "oldest"];

async function loadDocument(slug: string) {
  return prisma.document.findUnique({
    where: { slug },
    include: {
      metadata: { include: { metadata: true } },
    },
  });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = await prisma.document.findUnique({
    where: { slug },
    select: {
      title: true,
      description: true,
      seoTitle: true,
      seoDescription: true,
      status: true,
      coverImage: true,
      id: true,
    },
  });
  if (!doc || doc.status !== "PUBLISHED") return { title: "Not found" };

  const description = (doc.seoDescription || doc.description).slice(0, 200);
  const image = doc.coverImage
    ? `${env.APP_URL}/api/documents/${doc.id}/cover`
    : undefined;

  return {
    title: doc.seoTitle || doc.title,
    description,
    openGraph: {
      title: doc.seoTitle || doc.title,
      description,
      images: image ? [{ url: image }] : undefined,
      type: "book",
    },
  };
}

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ rsort?: string }>;
}) {
  const { slug } = await params;
  const { rsort } = await searchParams;
  const sort: ReviewSort = REVIEW_SORTS.includes(rsort as ReviewSort)
    ? (rsort as ReviewSort)
    : "helpful";
  const doc = await loadDocument(slug);
  const user = await getCurrentUser();
  const isAdmin = user?.role === "ADMIN";

  if (!doc || (doc.status !== "PUBLISHED" && !isAdmin)) notFound();

  const access = await getReadAccess(user, doc.id);

  // Wishlist state (FR-13): only relevant to a signed-in reader who cannot
  // already read the title.
  const wishlisted =
    user && !access.canReadFull
      ? !!(await prisma.wishlist.findUnique({
          where: { userId_documentId: { userId: user.id, documentId: doc.id } },
          select: { id: true },
        }))
      : false;

  // Visibility rule (FR-3): only metadata fields that have a value are shown,
  // in display order, and only active definitions.
  const visibleMetadata = doc.metadata
    .filter((m) => m.metadata.active && m.value.trim())
    .sort((a, b) => a.metadata.displayOrder - b.metadata.displayOrder);

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-10">
      {doc.status === "PUBLISHED" && !isAdmin && <ViewBeacon documentId={doc.id} />}
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-[220px_1fr]">
        {/* Cover */}
        <div className="mx-auto w-full max-w-[220px]">
          <BookCover
            documentId={doc.id}
            title={doc.title}
            className="aspect-[3/4] rounded-xl ring-1 ring-black/5"
            titleClass="text-xl"
          />
        </div>

        {/* Details */}
        <div className="space-y-5">
          <div>
            {doc.status !== "PUBLISHED" && (
              <span className="mb-2 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Draft preview (admin)
              </span>
            )}
            <h1 className="text-2xl font-semibold tracking-tight">{doc.title}</h1>
            <p className="mt-1 text-lg text-neutral-500">
              {isFree(doc.price) ? "Free" : formatPrice(doc.price, doc.currency)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {access.canReadFull ? (
              <Link href={`/read/${doc.slug}`} className={buttonVariants({ size: "lg" })}>
                Read now
              </Link>
            ) : (
              <BuyButton
                slug={doc.slug}
                isAuthenticated={!!user}
                label={isFree(doc.price) ? "Get it free" : "Buy to read in full"}
              />
            )}
            <Link
              href={`/read/${doc.slug}?mode=sample`}
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Read sample
            </Link>
            {!access.canReadFull && (
              <WishlistButton
                documentId={doc.id}
                initialWishlisted={wishlisted}
                isAuthenticated={!!user}
                signInHref={`/login?callbackUrl=${encodeURIComponent(`/book/${doc.slug}`)}`}
              />
            )}
          </div>

          <p className="whitespace-pre-line text-neutral-700 dark:text-neutral-300">
            {doc.description}
          </p>

          {visibleMetadata.length > 0 && (
            <dl className="grid grid-cols-1 gap-x-8 gap-y-2 border-t border-neutral-200 pt-4 sm:grid-cols-2 dark:border-neutral-800">
              {visibleMetadata.map((m) => (
                <div key={m.id} className="flex justify-between gap-4 py-1">
                  <dt className="text-neutral-500">{m.metadata.name}</dt>
                  <dd className="text-right font-medium">{m.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>

      {doc.status === "PUBLISHED" && (
        <ReviewsSection documentId={doc.id} slug={doc.slug} sort={sort} user={user} />
      )}
    </main>
  );
}
