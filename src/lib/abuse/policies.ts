import type { AbuseAction, RateLimitPolicy } from "./ports";

export const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

/** Conservative auth bar: 5 attempts / 15 minutes (ADR-0016). */
export const AUTH_RATE_POLICY: RateLimitPolicy = {
  limit: 5,
  windowMs: FIFTEEN_MINUTES_MS,
};

export const ABUSE_POLICIES: Record<AbuseAction, RateLimitPolicy> = {
  login: AUTH_RATE_POLICY,
  register: AUTH_RATE_POLICY,
  "password-forgot": AUTH_RATE_POLICY,
  "password-reset": AUTH_RATE_POLICY,
  "password-change": AUTH_RATE_POLICY,
  "email-resend": AUTH_RATE_POLICY,
  "admin-login": AUTH_RATE_POLICY,
  checkout: { limit: 10, windowMs: FIFTEEN_MINUTES_MS },
  "payment-start": { limit: 5, windowMs: FIFTEEN_MINUTES_MS },
  webhook: { limit: 60, windowMs: FIFTEEN_MINUTES_MS },
};
