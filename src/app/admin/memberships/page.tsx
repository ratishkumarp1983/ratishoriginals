import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { MembershipManager } from "@/components/admin/membership-manager";

export const metadata: Metadata = { title: "Memberships" };

export default async function MembershipsAdminPage() {
  const [plans, documents] = await Promise.all([
    prisma.membership.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        documents: { select: { documentId: true } },
        _count: { select: { userMemberships: true } },
      },
    }),
    prisma.document.findMany({
      orderBy: { title: "asc" },
      select: { id: true, title: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Memberships</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Configure plans and choose which titles members can read as part of
          their subscription.
        </p>
      </div>
      <MembershipManager
        documents={documents}
        initialPlans={plans.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price.toString(),
          currency: p.currency,
          durationDays: p.durationDays,
          benefits: p.benefits,
          active: p.active,
          subscribers: p._count.userMemberships,
          documentIds: p.documents.map((d) => d.documentId),
        }))}
      />
    </div>
  );
}
