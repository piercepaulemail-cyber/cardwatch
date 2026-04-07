import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let _rateLimiter: Ratelimit | null = null;

function getRateLimiter(): Ratelimit | null {
  if (_rateLimiter) return _rateLimiter;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn("[RateLimit] Upstash not configured — rate limiting disabled");
    return null;
  }

  _rateLimiter = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(5, "15 m"), // 5 requests per 15 minutes
    analytics: true,
  });

  return _rateLimiter;
}

/**
 * Rate limit by key. Returns { allowed, remaining }.
 * Falls back to always-allowed if Upstash is not configured.
 */
export async function rateLimit(
  key: string,
  _maxAttempts?: number,
  _windowMs?: number
): Promise<{ allowed: boolean; remaining: number }> {
  const limiter = getRateLimiter();

  if (!limiter) {
    return { allowed: true, remaining: 999 };
  }

  try {
    const result = await limiter.limit(key);
    return { allowed: result.success, remaining: result.remaining };
  } catch (e) {
    console.error("[RateLimit] Error:", e);
    return { allowed: true, remaining: 999 }; // fail open
  }
}
