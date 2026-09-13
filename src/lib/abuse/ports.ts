export interface RateLimitPolicy {
  limit: number;
  windowMs: number;
}

export type RateLimitDecision = { ok: true } | { ok: false; retryAfterSec: number };

/**
 * Sliding-window counter. The same port can back in-process memory today
 * and a Redis adapter later without changing callers (ADR-0016, ADR-0042).
 */
export interface RateLimiter {
  consume(key: string, policy?: RateLimitPolicy): Promise<RateLimitDecision>;
}

export type AbuseAction =
  | "login"
  | "register"
  | "password-forgot"
  | "password-reset"
  | "password-change"
  | "email-resend"
  | "admin-login"
  | "checkout"
  | "payment-start"
  | "webhook";
