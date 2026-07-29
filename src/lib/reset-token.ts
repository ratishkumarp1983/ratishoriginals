import { createHash, randomBytes } from "node:crypto";

/**
 * Password-reset tokens. We hand the user a random token in the email link but
 * store only its SHA-256 hash in VerificationToken, so a leaked database row
 * cannot be used to reset a password. Identifier is namespaced to avoid
 * colliding with other verification uses.
 */
export const RESET_PREFIX = "pwreset:";

export function newResetToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("hex");
  return { token, hash: hashResetToken(token) };
}

export function hashResetToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
