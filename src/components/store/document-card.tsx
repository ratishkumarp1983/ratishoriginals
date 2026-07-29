import Link from "next/link";
import { formatPrice, isFree } from "@/lib/format";

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
      <div className="aspect-[3/4] overflow-hidden bg-neutral-100 dark:bg-neutral-900">
        {doc.hasCover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/documents/${doc.id}/cover`}
            alt={`Cover of ${doc.title}`}
            className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-center text-sm text-neutral-400">
            {doc.title}
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <h3 className="line-clamp-2 text-sm font-medium">{doc.title}</h3>
        <span className="mt-auto text-sm text-neutral-500">
          {isFree(doc.price) ? "Free" : formatPrice(doc.price, doc.currency)}
        </span>
      </div>
    </Link>
  );
}
