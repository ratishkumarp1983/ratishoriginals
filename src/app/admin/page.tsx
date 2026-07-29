import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth-helpers";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const user = await requireAdmin();

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Admin dashboard</h1>
      <p className="mt-3 text-neutral-500">
        Signed in as {user.email}. Document management, memberships, coupons,
        analytics, and audit logs are built in later steps.
      </p>
    </main>
  );
}
