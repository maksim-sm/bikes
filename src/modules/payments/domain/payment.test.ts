import { describe, expect, it } from "vitest";
import {
  applyProviderEvent,
  canCancelPayment,
  canStartPayment,
  canTransition,
  type PaymentAttempt,
} from "./payment";
import { paymentAttemptIdempotencyKey } from "./provider";

function attempt(status: PaymentAttempt["status"]): PaymentAttempt {
  return {
    id: "p1",
    orderId: "o1",
    provider: "mock",
    providerPaymentId: "p1",
    amountMinor: 100,
    currency: "BYN",
    status,
    idempotencyKey: paymentAttemptIdempotencyKey("o1", 1),
    expiresAt: new Date("2026-09-12T10:15:00.000Z"),
  };
}

describe("payment lifecycle", () => {
  it("starts created and can move through pending, authorized, and paid", () => {
    expect(applyProviderEvent(attempt("CREATED"), "PENDING")).toBe("PENDING");
    expect(applyProviderEvent(attempt("PENDING"), "AUTHORIZED")).toBe("AUTHORIZED");
    expect(applyProviderEvent(attempt("AUTHORIZED"), "SUCCEEDED")).toBe("SUCCEEDED");
    expect(applyProviderEvent(attempt("CREATED"), "SUCCEEDED")).toBe("SUCCEEDED");
  });

  it("allows failed, expired, and cancelled from an open attempt", () => {
    expect(applyProviderEvent(attempt("CREATED"), "FAILED")).toBe("FAILED");
    expect(applyProviderEvent(attempt("PENDING"), "EXPIRED")).toBe("EXPIRED");
    expect(applyProviderEvent(attempt("AUTHORIZED"), "CANCELLED")).toBe("CANCELLED");
    expect(canCancelPayment(attempt("CREATED"))).toBe(true);
    expect(canCancelPayment(attempt("SUCCEEDED"))).toBe(false);
  });

  it("supports refund pending and partial refunds after capture", () => {
    expect(applyProviderEvent(attempt("SUCCEEDED"), "REFUND_PENDING")).toBe(
      "REFUND_PENDING",
    );
    expect(applyProviderEvent(attempt("REFUND_PENDING"), "REFUNDED")).toBe("REFUNDED");
    expect(applyProviderEvent(attempt("SUCCEEDED"), "PARTIALLY_REFUNDED")).toBe(
      "PARTIALLY_REFUNDED",
    );
    expect(applyProviderEvent(attempt("PARTIALLY_REFUNDED"), "REFUNDED")).toBe(
      "REFUNDED",
    );
    expect(() => applyProviderEvent(attempt("CREATED"), "REFUNDED")).toThrow(
      "illegal_payment_transition",
    );
    expect(canTransition("REFUNDED", "PARTIALLY_REFUNDED")).toBe(false);
  });

  it("blocks a second attempt while money is still open", () => {
    expect(canStartPayment([attempt("CREATED")])).toBe(false);
    expect(canStartPayment([attempt("AUTHORIZED")])).toBe(false);
    expect(canStartPayment([attempt("REFUND_PENDING")])).toBe(false);
    expect(canStartPayment([attempt("FAILED")])).toBe(true);
    expect(canStartPayment([attempt("EXPIRED")])).toBe(true);
    expect(canStartPayment([attempt("CANCELLED")])).toBe(true);
    expect(canStartPayment([attempt("REFUNDED")])).toBe(true);
  });
});
