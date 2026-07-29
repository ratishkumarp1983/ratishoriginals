import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { email as emailAdapter } from "@/lib/adapters/email";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { env } from "@/lib/env";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
  source: z.string().trim().max(40).optional(),
  turnstileToken: z.string().optional(),
});

/** Newsletter signup: the owned-audience capture. Responds generically. */
export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  const limited = await rateLimit(`newsletter:${ip}`, 5, 60_000);
  if (!limited.success) {
    return NextResponse.json({ error: "Too many attempts." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid email" },
      { status: 400 },
    );
  }

  if (!(await verifyTurnstile(parsed.data.turnstileToken, ip))) {
    return NextResponse.json({ error: "Verification failed." }, { status: 400 });
  }

  const { email, source } = parsed.data;

  const existing = await prisma.newsletterSubscriber.findUnique({
    where: { email },
    select: { id: true, unsubscribed: true },
  });

  if (!existing) {
    await prisma.newsletterSubscriber.create({
      data: { email, source: source ?? "home" },
    });
    await emailAdapter().send({
      to: email,
      subject: `Welcome to ${env.APP_NAME}`,
      text:
        `Thanks for subscribing to ${env.APP_NAME}.\n\n` +
        `You will hear first about new releases, member offers, and reading notes. ` +
        `As a welcome, a free chapter is on its way.`,
      html:
        `<p>Thanks for subscribing to <strong>${env.APP_NAME}</strong>.</p>` +
        `<p>You will hear first about new releases, member offers, and reading notes. As a welcome, a free chapter is on its way.</p>`,
    });
  } else if (existing.unsubscribed) {
    await prisma.newsletterSubscriber.update({
      where: { email },
      data: { unsubscribed: false },
    });
  }

  return NextResponse.json({
    ok: true,
    message: "You are on the list. Check your inbox for a welcome note.",
  });
}
