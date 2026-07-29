import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Audit log" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string }>;
}) {
  const sp = await searchParams;
  const action = sp.action && sp.action !== "all" ? sp.action : null;
  const where = action ? { action } : {};

  const total = await prisma.auditLog.count({ where });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  // Clamp the requested page into range so an out-of-range ?page shows the last
  // page instead of an empty table.
  const page = Math.min(Math.max(1, Number(sp.page) || 1), pages);

  const [rows, actionGroups] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        action: true,
        targetType: true,
        targetId: true,
        metadata: true,
        ip: true,
        createdAt: true,
        actor: { select: { email: true } },
      },
    }),
    prisma.auditLog.groupBy({ by: ["action"], _count: { _all: true }, orderBy: { action: "asc" } }),
  ]);
  const qs = (p: number) =>
    `/admin/audit?page=${p}${action ? `&action=${encodeURIComponent(action)}` : ""}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit log</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Every sensitive action, newest first. {total.toLocaleString("en-IN")} entries
          {action ? ` for "${action}"` : ""}.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 text-xs">
        <FilterChip label="All" active={!action} href="/admin/audit" />
        {actionGroups.map((g) => (
          <FilterChip
            key={g.action}
            label={`${g.action} (${g._count._all})`}
            active={action === g.action}
            href={`/admin/audit?action=${encodeURIComponent(g.action)}`}
          />
        ))}
      </div>

      <div className="overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800">
            <tr>
              <th className="px-4 py-2 font-medium">Time (UTC)</th>
              <th className="px-4 py-2 font-medium">Action</th>
              <th className="px-4 py-2 font-medium">Actor</th>
              <th className="px-4 py-2 font-medium">Target</th>
              <th className="px-4 py-2 font-medium">Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                  No audit entries.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id} className="border-b border-neutral-100 align-top last:border-0 dark:border-neutral-900">
                  <td className="whitespace-nowrap px-4 py-2 tabular-nums text-neutral-500">
                    {r.createdAt.toISOString().replace("T", " ").slice(0, 19)}
                  </td>
                  <td className="px-4 py-2 font-medium">{r.action}</td>
                  <td className="px-4 py-2 text-neutral-600 dark:text-neutral-400">
                    {r.actor?.email ?? "system"}
                  </td>
                  <td className="px-4 py-2 text-neutral-500">
                    {r.targetType ? `${r.targetType}${r.targetId ? `:${r.targetId.slice(0, 8)}` : ""}` : "-"}
                  </td>
                  <td className="max-w-[280px] truncate px-4 py-2 font-mono text-xs text-neutral-500">
                    {r.metadata ? JSON.stringify(r.metadata) : ""}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <PageLink label="Previous" href={qs(page - 1)} disabled={page <= 1} />
          <span className="text-neutral-500">
            Page {page} of {pages}
          </span>
          <PageLink label="Next" href={qs(page + 1)} disabled={page >= pages} />
        </div>
      )}
    </div>
  );
}

function FilterChip({ label, active, href }: { label: string; active: boolean; href: string }) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 ${
        active
          ? "border-neutral-900 bg-neutral-900 text-white dark:border-neutral-100 dark:bg-neutral-100 dark:text-neutral-900"
          : "border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-800"
      }`}
    >
      {label}
    </Link>
  );
}

function PageLink({ label, href, disabled }: { label: string; href: string; disabled: boolean }) {
  if (disabled) {
    return <span className="text-neutral-300 dark:text-neutral-700">{label}</span>;
  }
  return (
    <Link href={href} className="font-medium underline">
      {label}
    </Link>
  );
}
