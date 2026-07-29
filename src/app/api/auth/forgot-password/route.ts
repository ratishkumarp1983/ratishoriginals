import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { verifyTurnstile } from "@/lib/turnstile";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { newResetToken, RESET_PREFIX } from "@/lib/reset-token";
import { email as emailAdapter } from "@/lib/adapters/email";
import { env } from "@/lib/env";
import { audit } from "@/lib/audit";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

/** FR-1.3 Password reset — request stage. Always responds generically. */
export async function POST(req: Request) {
  const ip = clientIp(req.headers);

  const limited = await rateLimit(`forgot:${ip}`, 5, 60_000);
  if (!limited.success) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again shortly." },
      { status: 429 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const { email, turnstileToken } = parsed.data;

  if (!(await verifyTurnstile(turnstileToken, ip))) {
    return NextResponse.json(
      { error: "Bot verification failed." },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({ where: { email } });

  // Only send a mail when the account exists AND has a password (Google-only
  // accounts have no password to reset). Either way the response is identical
  // so we never disclose account existence.
  if (user?.passwordHash) {
    const { token, hash } = newResetToken();
    const identifier = `${RESET_PREFIX}${email}`;

    // One outstanding reset token per user.
    await prisma.verificationToken.deleteMany({ where: { identifier } });
    await prisma.verificationToken.create({
      data: {
        identifier,
        token: hash,
        expires: new Date(Date.now() + TOKEN_TTL_MS),
      },
    });

    const link = `${env.APP_URL}/reset-password?token=${token}`;
    await emailAdapter().send({
      to: email,
      subject: "Reset your Ratish Originals password",
      text: `Reset your password using this link (valid for 1 hour):\n\n${link}\n\nIf you did not request this, ignore this email.`,
      html: `<p>Reset your password using this link (valid for 1 hour):</p><p><a href="${link}">${link}</a></p><p>If you did not request this, ignore this email.</p>`,
    });

    await audit({
      action: "PASSWORD_RESET_REQUEST",
      actorId: user.id,
      targetType: "User",
      targetId: user.id,
      ip,
    });
  }

  return NextResponse.json({
    ok: true,
    message:
      "If an account exists for that email, a reset link has been sent.",
  });
}
