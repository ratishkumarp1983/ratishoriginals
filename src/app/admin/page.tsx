import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getOverview } from "@/lib/analytics";
import { formatPrice } from "@/lib/format";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [totalDocs, publishedDocs, readers, overview] = await Promise.all([
    prisma.document.count(),
    prisma.document.count({ where: { status: "PUBLISHED" } }),
    prisma.user.count(),
    getOverview("all"),
  ]);

  const stats = [
    { label: "Revenue (all time)", value: formatPrice(overview.revenue, overview.currency) },
    { label: "Purchases", value: overview.purchases.toLocaleString("en-IN") },
    { label: "Active memberships", value: overview.activeMemberships.toLocaleString("en-IN") },
    { label: "Views", value: overview.views.toLocaleString("en-IN") },
    { label: "Published titles", value: `${publishedDocs} / ${totalDocs}` },
    { label: "Users", value: readers.toLocaleString("en-IN") },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <div className="flex items-center gap-2">
          <Link href="/admin/analytics" className={buttonVariants({ variant: "outline", size: "sm" })}>
            View analytics
          </Link>
          <Link href="/admin/documents/new" className={buttonVariants({ size: "sm" })}>
            New document
          </Link>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
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
        Full revenue, conversion, and coupon breakdowns are on the{" "}
        <Link href="/admin/analytics" className="underline">
          analytics page
        </Link>
        ; the{" "}
        <Link href="/admin/audit" className="underline">
          audit log
        </Link>{" "}
        records every sensitive action.
      </p>
    </div>
  );
}
