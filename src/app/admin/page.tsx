import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminDashboardPage() {
  const [totalDocs, publishedDocs, metadataFields, readers] = await Promise.all([
    prisma.document.count(),
    prisma.document.count({ where: { status: "PUBLISHED" } }),
    prisma.metadataDefinition.count(),
    prisma.user.count(),
  ]);

  const stats = [
    { label: "Documents", value: totalDocs },
    { label: "Published", value: publishedDocs },
    { label: "Metadata fields", value: metadataFields },
    { label: "Users", value: readers },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <Link href="/admin/documents/new" className={buttonVariants({ size: "sm" })}>
          New document
        </Link>
      </div>

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-800"
          >
            <dt className="text-sm text-neutral-500">{s.label}</dt>
            <dd className="mt-1 text-3xl font-semibold tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>

      <p className="text-sm text-neutral-500">
        Sales, revenue, memberships, and audit-log analytics arrive in later
        steps.
      </p>
    </div>
  );
}
