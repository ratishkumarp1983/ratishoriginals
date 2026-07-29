import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";
import { createSubscriptionOrder, SubscriptionError } from "@/lib/membership";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({ membershipId: z.string().uuid() });

/** Start a membership subscription for the current user (SRS FR-7). */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const limited = await rateLimit(`subscribe:${user.id}`, 15, 60_000);
  if (!limited.success) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: { id: parsed.data.membershipId },
  });
  if (!membership || !membership.active) {
    return NextResponse.json({ error: "Plan not available" }, { status: 404 });
  }

  try {
    const result = await createSubscriptionOrder({ user, membership });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof SubscriptionError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[subscribe] failed", err);
    return NextResponse.json({ error: "Subscription failed." }, { status: 500 });
  }
}
