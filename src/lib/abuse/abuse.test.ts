import { describe, expect, it } from "vitest";
import { RateLimitedError } from "@/lib/errors";
import {
  ABUSE_POLICIES,
  actionRateKey,
  assertAbuseLimit,
  assertRateLimit,
  clientIp,
  clientRateKey,
  createMemoryRateLimiter,
  emailRatePart,
} from "./index";

describe("abuse keys", () => {
  it("takes the first forwarded hop and hashes email", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }))).toBe(
      "203.0.113.9",
    );
    expect(clientIp(new Headers())).toBe("local");
    expect(clientRateKey({ headers: new Headers() }, "login")).toBe("login:local");
    expect(actionRateKey("admin-login", "203.0.113.9")).toBe("admin-login:203.0.113.9");
    expect(emailRatePart("Ira@Example.BY")).toBe(emailRatePart("ira@example.by"));
    expect(emailRatePart("ira@example.by")).not.toContain("@");
  });
});

describe("memory rate limiter", () => {
  it("allows up to the limit and then reports retryAfter", async () => {
    const limiter = createMemoryRateLimiter({ limit: 2, windowMs: 60_000 });
    expect(await limiter.consume("k")).toEqual({ ok: true });
    expect(await limiter.consume("k")).toEqual({ ok: true });
    const blocked = await limiter.consume("k");
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.retryAfterSec).toBeGreaterThan(0);
    }
    expect((await limiter.consume("other")).ok).toBe(true);
  });

  it("applies a per-call policy so webhooks can be looser than login", async () => {
    const limiter = createMemoryRateLimiter({ limit: 1, windowMs: 60_000 });
    expect((await limiter.consume("login")).ok).toBe(true);
    expect((await limiter.consume("login")).ok).toBe(false);
    expect((await limiter.consume("hook", ABUSE_POLICIES.webhook)).ok).toBe(true);
    expect((await limiter.consume("hook", ABUSE_POLICIES.webhook)).ok).toBe(true);
  });
});

describe("assertAbuseLimit", () => {
  it("throws RateLimitedError after the limiter default is exhausted", async () => {
    const limiter = createMemoryRateLimiter({ limit: 1, windowMs: 60_000 });
    await assertRateLimit(limiter, "x");
    await expect(assertRateLimit(limiter, "x")).rejects.toBeInstanceOf(RateLimitedError);
    await assertAbuseLimit(createMemoryRateLimiter(), "webhook", ["local"]);
  });
});
