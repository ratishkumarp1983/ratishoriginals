import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth-helpers";
import { getActiveMembership } from "@/lib/membership";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Account" };
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireUser("/account");
  const membership = await getActiveMembership(user.id);

  const membershipValue = membership
    ? `${membership.membership.name}${
        membership.expiresAt
          ? ` (until ${membership.expiresAt.toISOString().slice(0, 10)})`
          : ""
      }`
    : "Not a member";

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Your account</h1>
      <dl className="mt-6 divide-y divide-neutral-200 dark:divide-neutral-800">
        <Row label="Name" value={user.name ?? "-"} />
        <Row label="Email" value={user.email} />
        <Row label="Role" value={user.role} />
        <Row label="Membership" value={membershipValue} />
      </dl>
      {!membership && (
        <Link href="/membership" className={buttonVariants({ className: "mt-6" })}>
          Become a premium reader
        </Link>
      )}
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-3">
      <dt className="text-neutral-500">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
