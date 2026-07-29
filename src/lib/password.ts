import { hash, verify } from "@node-rs/argon2";

/**
 * Password hashing with Argon2id (SRS §8). @node-rs/argon2 ships prebuilt
 * native binaries, so there is no compiler toolchain requirement on Windows.
 *
 * Policy is enforced at the validation layer (min 12 chars, 14+ recommended);
 * this module only hashes/verifies.
 */
const OPTS = {
  // Reasonable interactive-login parameters.
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
} as const;

export function hashPassword(plain: string): Promise<string> {
  return hash(plain, OPTS);
}

export async function verifyPassword(
  storedHash: string,
  plain: string,
): Promise<boolean> {
  try {
    return await verify(storedHash, plain);
  } catch {
    return false;
  }
}

export const PASSWORD_MIN_LENGTH = 12;
