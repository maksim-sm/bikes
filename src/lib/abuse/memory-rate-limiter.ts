import { AUTH_RATE_POLICY } from "./policies";
import type { RateLimitDecision, RateLimitPolicy, RateLimiter } from "./ports";

/**
 * In-process sliding window. Fits a single Next.js deployment (architecture
 * §15). A Redis adapter can implement the same `RateLimiter` port if a
 * second instance or a measured shared-state need appears.
 */
export function createMemoryRateLimiter(
  defaults: RateLimitPolicy = AUTH_RATE_POLICY,
): RateLimiter {
  const hits = new Map<string, number[]>();

  return {
    async consume(key, policy = defaults): Promise<RateLimitDecision> {
      const now = Date.now();
      const recent = (hits.get(key) ?? []).filter((at) => now - at < policy.windowMs);
      if (recent.length >= policy.limit) {
        const retryAfterSec = Math.max(
          1,
          Math.ceil((policy.windowMs - (now - recent[0]!)) / 1000),
        );
        hits.set(key, recent);
        return { ok: false, retryAfterSec };
      }
      recent.push(now);
      hits.set(key, recent);
      return { ok: true };
    },
  };
}
