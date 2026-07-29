import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { MetadataManager } from "@/components/admin/metadata-manager";

export const metadata: Metadata = { title: "Metadata fields" };

export default async function MetadataPage() {
  const fields = await prisma.metadataDefinition.findMany({
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Metadata fields</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Define fields once here; they become available on every document. Only
          fields with a value show on a document&apos;s public page.
        </p>
      </div>
      <MetadataManager
        initialFields={fields.map((f) => ({
          id: f.id,
          name: f.name,
          key: f.key,
          type: f.type,
          displayOrder: f.displayOrder,
          active: f.active,
        }))}
      />
    </div>
  );
}
