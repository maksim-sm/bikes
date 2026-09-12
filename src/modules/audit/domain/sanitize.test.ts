import { describe, expect, it } from "vitest";
import { sanitizeAuditValue } from "./sanitize";

describe("audit payload sanitization", () => {
  it("redacts secrets and payment instrument fields, keeps status and amounts", () => {
    expect(
      sanitizeAuditValue({
        status: "REFUNDED",
        amountMinor: 4500,
        password: "correct-horse",
        passwordHash: "argon2...",
        cardNumber: "4111111111111111",
        cvv: "123",
        rawBody: '{"pan":"4111"}',
        providerPayload: { secret: "k" },
        token: "sess-1",
      }),
    ).toEqual({
      status: "REFUNDED",
      amountMinor: 4500,
      password: "[redacted]",
      passwordHash: "[redacted]",
      cardNumber: "[redacted]",
      cvv: "[redacted]",
      rawBody: "[redacted]",
      providerPayload: "[redacted]",
      token: "[redacted]",
    });
  });
});
