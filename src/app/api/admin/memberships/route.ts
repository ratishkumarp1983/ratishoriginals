import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminForApi } from "@/lib/auth-helpers";
import { membershipCreateSchema } from "@/lib/validation/membership";
import { uniqueMembershipSlug } from "@/lib/slugify-simple";
import { audit } from "@/lib/audit";
import { clientIp } from "@/lib/rate-limit";

function forbid(status: 401 | 403) {
  return NextResponse.json(
    { error: status === 401 ? "Unauthorized" : "Forbidden" },
    { status },
  );
}

export async function GET() {
  const guard = await getAdminForApi();
  if ("error" in guard) return forbid(guard.error);
  const memberships = await prisma.membership.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { documents: true, userMemberships: true } } },
  });
  return NextResponse.json({ memberships });
}

export async function POST(req: Request) {
  const guard = await getAdminForApi();
  if ("error" in guard) return forbid(guard.error);

  const body = await req.json().catch(() => null);
  const parsed = membershipCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const slug = await uniqueMembershipSlug(parsed.data.name);
  const membership = await prisma.membership.create({
    data: {
      name: parsed.data.name,
      slug,
      price: parsed.data.price,
      currency: parsed.data.currency,
      durationDays: parsed.data.durationDays,
      benefits: parsed.data.benefits,
      active: parsed.data.active,
    },
  });

  await audit({
    action: "MEMBERSHIP_PLAN_CREATE",
    actorId: guard.user.id,
    targetType: "Membership",
    targetId: membership.id,
    metadata: { name: membership.name },
    ip: clientIp(req.headers),
  });

  return NextResponse.json({ membership }, { status: 201 });
}
