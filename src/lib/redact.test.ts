import { describe, expect, it } from "vitest";
import { logger } from "./logger";
import { redactContext } from "./redact";

describe("log redaction", () => {
  it("strips secrets, card fields, and tokens from context", () => {
    const redacted = redactContext({
      requestId: "r1",
      password: "hunter2",
      AUTH_SECRET: "super-secret-value-here",
      cardNumber: "4111111111111111",
      cvv: "123",
      apiKey: "sk_live_abc",
      paymentToken: "tok_full_value",
      status: "FAILED",
    });
    expect(redacted).toEqual({
      requestId: "r1",
      password: "[redacted]",
      AUTH_SECRET: "[redacted]",
      cardNumber: "[redacted]",
      cvv: "[redacted]",
      apiKey: "[redacted]",
      paymentToken: "[redacted]",
      status: "FAILED",
    });
  });

  it("still emits structured lines after redaction", () => {
    expect(() =>
      logger.info("probe", { sessionToken: "abc", path: "/api/health" }),
    ).not.toThrow();
  });
});
