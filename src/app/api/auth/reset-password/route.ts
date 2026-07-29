import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";
import { resetPasswordSchema } from "@/lib/validation/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { hashResetToken, RESET_PREFIX } from "@/lib/reset-token";
import { audit } from "@/lib/audit";

/** FR-1.3 Password reset - completion stage. */
export async function POST(req: Request) {
  const ip = clientIp(req.headers);

  const limited = await rateLimit(`reset:${ip}`, 10, 60_000);
  if (!limited.success) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again shortly." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const { token, password } = parsed.data;

  const hash = hashResetToken(token);
  const record = await prisma.verificationToken.findFirst({
    where: { token: hash, identifier: { startsWith: RESET_PREFIX } },
  });

  if (!record || record.expires < new Date()) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired." },
      { status: 400 },
    );
  }

  const email = record.identifier.slice(RESET_PREFIX.length);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired." },
      { status: 400 },
    );
  }

  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    // Bumping tokenVersion invalidates every JWT issued before the reset (the
    // app uses JWT sessions, so there are no DB session rows to delete).
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    }),
    prisma.verificationToken.deleteMany({
      where: { identifier: record.identifier },
    }),
  ]);

  await audit({
    action: "PASSWORD_RESET_COMPLETE",
    actorId: user.id,
    targetType: "User",
    targetId: user.id,
    ip,
  });

  return NextResponse.json({ ok: true });
}
