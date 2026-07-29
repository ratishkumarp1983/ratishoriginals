import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DeleteDocumentButton } from "@/components/admin/delete-document-button";

export const metadata: Metadata = { title: "Documents" };

function formatPrice(price: { toString(): string }, currency: string) {
  const n = Number(price.toString());
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

export default async function AdminDocumentsPage() {
  const documents = await prisma.document.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      status: true,
      price: true,
      currency: true,
      pageCount: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        <Link href="/admin/documents/new" className={buttonVariants({ size: "sm" })}>
          New document
        </Link>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Pages</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-neutral-500">
                No documents yet. Create your first one.
              </TableCell>
            </TableRow>
          ) : (
            documents.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-medium">{d.title}</TableCell>
                <TableCell>
                  <Badge
                    variant={d.status === "PUBLISHED" ? "default" : "secondary"}
                  >
                    {d.status}
                  </Badge>
                </TableCell>
                <TableCell>{formatPrice(d.price, d.currency)}</TableCell>
                <TableCell>{d.pageCount ?? "-"}</TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/admin/documents/${d.id}/edit`}
                    className={buttonVariants({ variant: "ghost", size: "sm" })}
                  >
                    Edit
                  </Link>
                  <DeleteDocumentButton id={d.id} title={d.title} />
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
