import Link from "next/link";
import type { Metadata } from "next";
import {
  getOverview,
  getTitlePerformance,
  getCouponUsage,
  type Range,
} from "@/lib/analytics";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

const pct = (v: number | null) => (v === null ? "-" : `${v.toFixed(1)}%`);

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const { range: rangeParam } = await searchParams;
  const range: Range = rangeParam === "30d" ? "30d" : "all";

  const [overview, titles, coupons] = await Promise.all([
    getOverview(range),
    getTitlePerformance(range),
    getCouponUsage(),
  ]);

  const money = (n: number) => formatPrice(n, overview.currency);

  const tiles = [
    { label: "Views", value: overview.views.toLocaleString("en-IN") },
    { label: "Purchases", value: overview.purchases.toLocaleString("en-IN") },
    { label: "Conversion", value: pct(overview.conversionPct) },
    {
      label: "Revenue",
      value: money(overview.revenue),
      hint: `${money(overview.purchaseRevenue)} sales + ${money(overview.membershipRevenue)} memberships`,
    },
    { label: "Active memberships", value: overview.activeMemberships.toLocaleString("en-IN") },
    { label: "Coupon redemptions", value: overview.couponRedemptions.toLocaleString("en-IN") },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <div className="flex items-center gap-1 rounded-lg border border-neutral-200 p-0.5 text-sm dark:border-neutral-800">
          <RangeTab current={range} value="all" label="All time" />
          <RangeTab current={range} value="30d" label="Last 30 days" />
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {tiles.map((t) => (
          <div
            key={t.label}
            className="rounded-xl border border-neutral-200 p-5 dark:border-neutral-800"
          >
            <dt className="text-sm text-neutral-500">{t.label}</dt>
            <dd className="mt-1 text-3xl font-semibold tabular-nums">{t.value}</dd>
            {t.hint && <p className="mt-1 text-xs text-neutral-400">{t.hint}</p>}
          </div>
        ))}
      </dl>

      <section>
        <h2 className="text-lg font-semibold tracking-tight">Title performance</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800">
              <tr>
                <th className="px-4 py-2 font-medium">Title</th>
                <th className="px-4 py-2 text-right font-medium">Views</th>
                <th className="px-4 py-2 text-right font-medium">Purchases</th>
                <th className="px-4 py-2 text-right font-medium">Conversion</th>
                <th className="px-4 py-2 text-right font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {titles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-neutral-500">
                    No titles yet.
                  </td>
                </tr>
              ) : (
                titles.map((t) => (
                  <tr key={t.documentId} className="border-b border-neutral-100 last:border-0 dark:border-neutral-900">
                    <td className="px-4 py-2">
                      <Link href={`/book/${t.slug}`} className="hover:underline">
                        {t.title}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{t.views}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{t.purchases}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{pct(t.conversionPct)}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{money(t.revenue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Coupon usage</h2>
          <span className="text-xs text-neutral-400">All time</span>
        </div>
        <div className="mt-3 overflow-x-auto rounded-xl border border-neutral-200 dark:border-neutral-800">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800">
              <tr>
                <th className="px-4 py-2 font-medium">Code</th>
                <th className="px-4 py-2 text-right font-medium">Used</th>
                <th className="px-4 py-2 text-right font-medium">Limit</th>
                <th className="px-4 py-2 text-right font-medium">Redemptions</th>
              </tr>
            </thead>
            <tbody>
              {coupons.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-neutral-500">
                    No coupons yet.
                  </td>
                </tr>
              ) : (
                coupons.map((c) => (
                  <tr key={c.code} className="border-b border-neutral-100 last:border-0 dark:border-neutral-900">
                    <td className="px-4 py-2 font-mono">{c.code}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{c.usedCount}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{c.usageLimit ?? "-"}</td>
                    <td className="px-4 py-2 text-right tabular-nums">{c.redemptions}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function RangeTab({
  current,
  value,
  label,
}: {
  current: Range;
  value: Range;
  label: string;
}) {
  const active = current === value;
  return (
    <Link
      href={`/admin/analytics?range=${value}`}
      className={`rounded-md px-3 py-1.5 ${
        active
          ? "bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900"
          : "text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
      }`}
    >
      {label}
    </Link>
  );
}
