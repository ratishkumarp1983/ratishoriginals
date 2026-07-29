import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { registerSchema } from "@/lib/validation/auth";
import { verifyTurnstile } from "@/lib/turnstile";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { audit } from "@/lib/audit";

/** FR-1.2 Email registration. */
export async function POST(req: Request) {
  const ip = clientIp(req.headers);

  const limited = await rateLimit(`register:${ip}`, 5, 60_000);
  if (!limited.success) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again shortly." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const { name, email, password, turnstileToken } = parsed.data;

  if (!(await verifyTurnstile(turnstileToken, ip))) {
    return NextResponse.json(
      { error: "Bot verification failed." },
      { status: 400 },
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // Do not reveal whether an email is registered.
    return NextResponse.json(
      { error: "Unable to register with those details." },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: { name, email, passwordHash, role: "READER" },
    select: { id: true, email: true },
  });

  await audit({
    action: "USER_REGISTER",
    actorId: user.id,
    targetType: "User",
    targetId: user.id,
    ip,
    userAgent: req.headers.get("user-agent"),
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
