import { RateLimitedError } from "@/lib/errors";
import { ABUSE_POLICIES } from "./policies";
import { abuseKey } from "./keys";
import type { AbuseAction, RateLimitPolicy, RateLimiter } from "./ports";

export async function assertRateLimit(
  limiter: RateLimiter,
  key: string,
  policy?: RateLimitPolicy,
): Promise<void> {
  const result = await limiter.consume(key, policy);
  if (!result.ok) {
    throw new RateLimitedError("too many attempts", {
      retryAfterSec: result.retryAfterSec,
    });
  }
}

export async function assertAbuseLimit(
  limiter: RateLimiter,
  action: AbuseAction,
  identities: readonly string[],
): Promise<void> {
  await assertRateLimit(limiter, abuseKey(action, identities), ABUSE_POLICIES[action]);
}
