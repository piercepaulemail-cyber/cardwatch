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

/** In-memory fallback when Redis is unavailable */
const fallbackStore = new Map<string, { count: number; resetAt: number }>();

function fallbackLimit(key: string, max: number, windowMs: number): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const entry = fallbackStore.get(key);

  if (!entry || now > entry.resetAt) {
    fallbackStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: max - 1 };
  }

  entry.count++;
  if (entry.count > max) {
    return { allowed: false, remaining: 0 };
  }
  return { allowed: true, remaining: max - entry.count };
}

/**
 * Rate limit by key. Returns { allowed, remaining }.
 * Falls back to in-memory rate limiting if Upstash is unavailable.
 */
export async function rateLimit(
  key: string,
  _maxAttempts?: number,
  _windowMs?: number
): Promise<{ allowed: boolean; remaining: number }> {
  const limiter = getRateLimiter();

  if (!limiter) {
    // Fallback: in-memory rate limiting (5 per 15 min)
    return fallbackLimit(key, 5, 15 * 60 * 1000);
  }

  try {
    const result = await limiter.limit(key);
    return { allowed: result.success, remaining: result.remaining };
  } catch (e) {
    console.error("[RateLimit] Redis error, using in-memory fallback:", e);
    return fallbackLimit(key, 5, 15 * 60 * 1000);
  }
}
