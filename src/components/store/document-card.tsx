import Link from "next/link";
import { formatPrice, isFree } from "@/lib/format";
import { BookCover } from "@/components/store/book-cover";

export interface DocumentCardData {
  id: string;
  slug: string;
  title: string;
  price: { toString(): string };
  currency: string;
  hasCover: boolean;
}

export function DocumentCard({ doc }: { doc: DocumentCardData }) {
  return (
    <Link
      href={`/book/${doc.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200 transition-colors hover:border-neutral-300 dark:border-neutral-800 dark:hover:border-neutral-700"
    >
      <BookCover
        documentId={doc.id}
        title={doc.title}
        className="aspect-[3/4]"
      />
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-medium">{doc.title}</h3>
        <span className="mt-auto text-sm text-neutral-500">
          {isFree(doc.price) ? "Free" : formatPrice(doc.price, doc.currency)}
        </span>
      </div>
    </Link>
  );
}
