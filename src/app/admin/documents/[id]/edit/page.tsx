import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { DocumentForm } from "@/components/admin/document-form";

export const metadata: Metadata = { title: "Edit document" };

export default async function EditDocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [doc, fields] = await Promise.all([
    prisma.document.findUnique({
      where: { id },
      include: { metadata: true },
    }),
    prisma.metadataDefinition.findMany({
      where: { active: true },
      orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, key: true, type: true },
    }),
  ]);

  if (!doc) notFound();

  const metadataValues: Record<string, string> = {};
  for (const m of doc.metadata) metadataValues[m.metadataId] = m.value;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Edit document</h1>
      <DocumentForm
        mode="edit"
        documentId={doc.id}
        metadataFields={fields}
        initial={{
          title: doc.title,
          description: doc.description,
          price: doc.price.toString(),
          currency: doc.currency,
          samplePages: doc.samplePages,
          status: doc.status === "PUBLISHED" ? "PUBLISHED" : "DRAFT",
          seoTitle: doc.seoTitle ?? "",
          seoDescription: doc.seoDescription ?? "",
          hasCover: !!doc.coverImage,
          fileType: doc.fileType,
          pageCount: doc.pageCount,
          metadataValues,
        }}
      />
    </div>
  );
}
