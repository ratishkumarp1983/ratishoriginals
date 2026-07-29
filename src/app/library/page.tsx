import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth-helpers";
import { getLibrary, type LibraryItem } from "@/lib/library";
import { buttonVariants } from "@/components/ui/button";
import { BookCover } from "@/components/store/book-cover";

export const metadata: Metadata = { title: "Library" };
export const dynamic = "force-dynamic";

export default async function LibraryPage() {
  const user = await requireUser("/library");
  const { owned, membership, continueReading } = await getLibrary(user.id);
  const isEmpty = owned.length === 0 && membership.length === 0;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-12">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Your library</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Everything you can read online, and where you left off.
          </p>
        </div>
        <Link href="/wishlist" className="text-sm font-medium underline">
          Saved for later
        </Link>
      </div>

      {isEmpty ? (
        <div className="mt-8 rounded-xl border border-dashed border-neutral-300 p-10 text-center dark:border-neutral-700">
          <p className="text-neutral-500">You have not added any titles yet.</p>
          <Link href="/browse" className={buttonVariants({ className: "mt-4" })}>
            Browse the catalog
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-12">
          {continueReading.length > 0 && (
            <Shelf title="Continue reading" items={continueReading} resume />
          )}
          {owned.length > 0 && (
            <Shelf
              title="Owned"
              subtitle="Yours to read online for life."
              items={owned}
            />
          )}
          {membership.length > 0 && (
            <Shelf
              title="From your membership"
              subtitle="Readable while your membership is active."
              items={membership}
            />
          )}
        </div>
      )}
    </main>
  );
}

function Shelf({
  title,
  subtitle,
  items,
  resume = false,
}: {
  title: string;
  subtitle?: string;
  items: LibraryItem[];
  resume?: boolean;
}) {
  return (
    <section>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      {subtitle && <p className="mt-0.5 text-sm text-neutral-500">{subtitle}</p>}
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {items.map((item) => (
          <LibraryCard key={item.documentId} item={item} resume={resume} />
        ))}
      </div>
    </section>
  );
}

function LibraryCard({ item, resume }: { item: LibraryItem; resume: boolean }) {
  const started = item.completionPercent > 0;
  const done = item.completionPercent >= 100;
  const cta = done ? "Read again" : resume || started ? `Resume p.${item.lastPage}` : "Read now";

  return (
    <Link
      href={`/read/${item.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200 transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700"
    >
      <BookCover documentId={item.documentId} title={item.title} className="aspect-[3/4]" />
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3 className="line-clamp-2 text-sm font-medium">{item.title}</h3>
        {started && (
          <div aria-hidden className="h-1 w-full rounded-full bg-neutral-200 dark:bg-neutral-800">
            <div
              className="h-1 rounded-full bg-brand-gold"
              style={{ width: `${Math.min(100, item.completionPercent)}%` }}
            />
          </div>
        )}
        <span className="mt-auto text-xs text-neutral-500 group-hover:underline">
          {cta}
          {started && !done ? ` · ${item.completionPercent}%` : ""}
        </span>
      </div>
    </Link>
  );
}
