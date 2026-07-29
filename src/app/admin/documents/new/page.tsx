import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { DocumentForm } from "@/components/admin/document-form";

export const metadata: Metadata = { title: "New document" };

export default async function NewDocumentPage() {
  const fields = await prisma.metadataDefinition.findMany({
    where: { active: true },
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, key: true, type: true },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">New document</h1>
      <DocumentForm mode="create" metadataFields={fields} />
    </div>
  );
}
