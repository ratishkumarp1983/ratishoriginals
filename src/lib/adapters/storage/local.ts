import { createHmac } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { env } from "@/lib/env";
import type { SignedUrl, StorageAdapter } from "./types";

/**
 * Local-disk storage for development. Objects live under STORAGE_LOCAL_DIR
 * (outside `public/`, so they are never statically served). "Signed URLs"
 * point at an authenticated app route that verifies an HMAC token AND the
 * caller's entitlement before streaming bytes - so even local dev enforces the
 * "no direct object URLs" rule.
 */
export class LocalStorageAdapter implements StorageAdapter {
  readonly name = "local";
  private root: string;

  constructor(rootDir = env.STORAGE_LOCAL_DIR) {
    this.root = path.isAbsolute(rootDir)
      ? rootDir
      : path.join(process.cwd(), rootDir);
  }

  private resolve(key: string): string {
    // Prevent path traversal: keys are treated as posix-ish relative paths.
    const safe = path
      .normalize(key)
      .replace(/^(\.\.(\/|\\|$))+/, "")
      .replace(/^[/\\]+/, "");
    return path.join(this.root, safe);
  }

  async put(key: string, data: Buffer): Promise<string> {
    const full = this.resolve(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, data);
    return key;
  }

  async get(key: string): Promise<Buffer> {
    return fs.readFile(this.resolve(key));
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.resolve(key));
      return true;
    } catch {
      return false;
    }
  }

  async delete(key: string): Promise<void> {
    try {
      await fs.unlink(this.resolve(key));
    } catch {
      /* idempotent */
    }
  }

  async signedUrl(
    key: string,
    ttlSeconds = env.STORAGE_SIGNED_URL_TTL,
  ): Promise<SignedUrl> {
    const expiresAt = Date.now() + ttlSeconds * 1000;
    const token = signToken(key, expiresAt);
    const params = new URLSearchParams({
      key,
      exp: String(expiresAt),
      sig: token,
    });
    return {
      url: `${env.APP_URL}/api/files?${params.toString()}`,
      expiresAt,
    };
  }
}

const TOKEN_SEP = ":";

/** HMAC over `${key}:${exp}` using AUTH_SECRET. */
export function signToken(key: string, expiresAt: number): string {
  return createHmac("sha256", env.AUTH_SECRET)
    .update(`${key}${TOKEN_SEP}${expiresAt}`)
    .digest("hex");
}

/** Constant-time verify of a local signed-url token. Does NOT check auth. */
export function verifyToken(
  key: string,
  expiresAt: number,
  sig: string,
): boolean {
  if (Number.isNaN(expiresAt) || expiresAt < Date.now()) return false;
  const expected = signToken(key, expiresAt);
  if (expected.length !== sig.length) return false;
  // timingSafeEqual-equivalent without importing again
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ sig.charCodeAt(i);
  }
  return diff === 0;
}
