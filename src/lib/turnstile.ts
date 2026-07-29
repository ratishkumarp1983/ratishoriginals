import { env, isTurnstileEnabled } from "@/lib/env";

/**
 * Cloudflare Turnstile server-side verification (SRS §8 bot protection).
 * When keys are not configured (dev), verification is bypassed so the auth
 * flows are usable without a Cloudflare account. Set both TURNSTILE_* vars to
 * enforce.
 */
export async function verifyTurnstile(
  token: string | undefined,
  remoteIp?: string,
): Promise<boolean> {
  if (!isTurnstileEnabled()) return true; // bypass in dev
  if (!token) return false;

  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: env.TURNSTILE_SECRET_KEY,
          response: token,
          remoteip: remoteIp,
        }),
      },
    );
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}
