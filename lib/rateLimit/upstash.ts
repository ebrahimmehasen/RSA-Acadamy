import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ENABLED =
  process.env.RATE_LIMIT_ENABLED === "true" &&
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN;

let authLimiter: Ratelimit | null = null;
let apiLimiter: Ratelimit | null = null;

if (ENABLED) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });
  // decision #-set in TECHNICAL_DECISIONS.md: auth 5/min, general API 1000/hr
  authLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, "1 m"),
    prefix: "rl:auth",
  });
  apiLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(1000, "1 h"),
    prefix: "rl:api",
  });
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
}

/** No-ops (always allowed) until RATE_LIMIT_ENABLED=true + Upstash creds are set. */
export async function checkAuthRateLimit(identifier: string): Promise<RateLimitResult> {
  if (!authLimiter) return { allowed: true, remaining: Infinity };
  const { success, remaining } = await authLimiter.limit(identifier);
  return { allowed: success, remaining };
}

export async function checkApiRateLimit(identifier: string): Promise<RateLimitResult> {
  if (!apiLimiter) return { allowed: true, remaining: Infinity };
  const { success, remaining } = await apiLimiter.limit(identifier);
  return { allowed: success, remaining };
}

export const rateLimitEnabled = ENABLED;
