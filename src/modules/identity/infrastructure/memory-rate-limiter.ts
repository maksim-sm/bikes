import type { RateLimiter } from "../application/auth-ports";

export function createMemoryRateLimiter(options?: {
  limit?: number;
  windowMs?: number;
}): RateLimiter {
  const limit = options?.limit ?? 5;
  const windowMs = options?.windowMs ?? 15 * 60 * 1000;
  const hits = new Map<string, number[]>();

  return {
    async consume(key) {
      const now = Date.now();
      const recent = (hits.get(key) ?? []).filter((at) => now - at < windowMs);
      if (recent.length >= limit) {
        const retryAfterSec = Math.ceil((windowMs - (now - recent[0]!)) / 1000);
        hits.set(key, recent);
        return { ok: false, retryAfterSec };
      }
      recent.push(now);
      hits.set(key, recent);
      return { ok: true };
    },
  };
}
