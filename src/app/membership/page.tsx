import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getActiveMembership } from "@/lib/membership";
import { formatPrice } from "@/lib/format";
import { env } from "@/lib/env";
import { SubscribeButton } from "@/components/store/subscribe-button";

export const metadata: Metadata = {
  title: "Membership",
  description: "Become a premium reader for member-only titles and discounts.",
};
export const dynamic = "force-dynamic";

function durationLabel(days: number): string {
  if (days % 365 === 0) return `${days / 365} year${days === 365 ? "" : "s"}`;
  if (days % 30 === 0) return `${days / 30} month${days === 30 ? "" : "s"}`;
  return `${days} days`;
}

export default async function MembershipPage() {
  const [plans, user] = await Promise.all([
    prisma.membership.findMany({ where: { active: true }, orderBy: { price: "asc" } }),
    getCurrentUser(),
  ]);
  const active = user ? await getActiveMembership(user.id) : null;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Become a premium reader</h1>
        <p className="mt-2 text-neutral-600 dark:text-neutral-400">
          Unlock member-only titles, member discounts, and early access to new releases.
        </p>
      </div>

      {active && (
        <div className="mb-8 rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm dark:border-emerald-900 dark:bg-emerald-950/40">
          <p className="font-medium text-emerald-800 dark:text-emerald-200">
            You are a {active.membership.name} member.
          </p>
          {active.expiresAt && (
            <p className="text-emerald-700 dark:text-emerald-300">
              Active until {active.expiresAt.toISOString().slice(0, 10)}.
            </p>
          )}
        </div>
      )}

      {plans.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-10 text-center text-neutral-500 dark:border-neutral-700">
          No membership plans are available yet.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2">
          {plans.map((plan) => {
            const benefits = plan.benefits
              .split("\n")
              .map((b) => b.trim())
              .filter(Boolean);
            return (
              <div
                key={plan.id}
                className="flex flex-col rounded-2xl border border-neutral-200 p-6 dark:border-neutral-800"
              >
                <h2 className="text-lg font-semibold">{plan.name}</h2>
                <p className="mt-1">
                  <span className="text-2xl font-semibold">
                    {formatPrice(plan.price, plan.currency)}
                  </span>
                  <span className="text-sm text-neutral-500">
                    {" "}
                    / {durationLabel(plan.durationDays)}
                  </span>
                </p>
                <ul className="mt-4 flex-1 space-y-2 text-sm text-neutral-700 dark:text-neutral-300">
                  {benefits.map((b) => (
                    <li key={b} className="flex gap-2">
                      <span aria-hidden className="text-emerald-500">
                        +
                      </span>
                      {b}
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  <SubscribeButton
                    membershipId={plan.id}
                    planName={plan.name}
                    appName={env.APP_NAME}
                    driver={env.PAYMENTS_DRIVER}
                    isAuthenticated={!!user}
                    label={active ? "Renew or extend" : `Join for ${formatPrice(plan.price, plan.currency)}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}
