import { env } from "@/lib/env";

/**
 * Fixed-window rate limiter (SRS §8). Uses Redis when REDIS_URL is set (shared
 * across instances); otherwise an in-process Map, which is fine for single-node
 * dev. Fails open on backend errors so a Redis outage never locks users out.
 */
export interface RateLimitResult {
  success: boolean;
  remaining: number;
  limit: number;
}

type RedisLike = {
  incr(key: string): Promise<number>;
  pexpire(key: string, ms: number): Promise<unknown>;
};

let redis: RedisLike | null | undefined;

async function getRedis(): Promise<RedisLike | null> {
  if (redis !== undefined) return redis;
  if (!env.REDIS_URL) {
    redis = null;
    return redis;
  }
  try {
    const { default: Redis } = await import("ioredis");
    redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 1, lazyConnect: true }) as unknown as RedisLike;
    return redis;
  } catch {
    redis = null;
    return redis;
  }
}

const memory = new Map<string, { count: number; expires: number }>();

export async function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const bucketKey = `rl:${key}`;
  const client = await getRedis();

  if (client) {
    try {
      const count = await client.incr(bucketKey);
      if (count === 1) await client.pexpire(bucketKey, windowMs);
      return {
        success: count <= limit,
        remaining: Math.max(0, limit - count),
        limit,
      };
    } catch {
      // fall through to memory on backend error (fail open)
    }
  }

  const now = Date.now();
  const entry = memory.get(bucketKey);
  if (!entry || entry.expires < now) {
    memory.set(bucketKey, { count: 1, expires: now + windowMs });
    return { success: true, remaining: limit - 1, limit };
  }
  entry.count += 1;
  return {
    success: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    limit,
  };
}

/**
 * Best-effort client IP for rate-limit keys.
 *
 * Every client-IP header (`cf-connecting-ip`, `x-real-ip`, `X-Forwarded-For`) is
 * client-controllable when the app is directly reachable: a caller can set or
 * rotate it to choose their own rate-limit bucket and evade per-IP limits,
 * including the login brute-force throttle. So we trust these headers ONLY when
 * `TRUST_PROXY` is set, which asserts the app sits behind a reverse proxy or CDN
 * that populates a real client IP and strips any client-supplied copies. When
 * that guarantee is absent we return a single shared key, so a forged header can
 * never grant per-IP granularity to spread an attack across buckets.
 *
 * With a trusted proxy we prefer `cf-connecting-ip` / `x-real-ip`, and when we
 * fall back to XFF we take the LAST hop (appended by our own proxy) rather than
 * the first (spoofable) entry.
 */
export function clientIp(headers: Headers): string {
  if (!env.TRUST_PROXY) return "untrusted";

  const direct = headers.get("cf-connecting-ip") ?? headers.get("x-real-ip");
  if (direct) return direct.trim();

  const xff = headers.get("x-forwarded-for");
  if (xff) {
    const hops = xff.split(",").map((h) => h.trim()).filter(Boolean);
    if (hops.length) return hops[hops.length - 1]!;
  }
  return "unknown";
}
