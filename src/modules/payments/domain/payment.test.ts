import { describe, expect, it } from "vitest";
import {
  applyProviderEvent,
  canCancelPayment,
  canStartPayment,
  canTransition,
  isPaymentTimedOut,
  refundStatus,
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
    expect(canStartPayment([attempt("SUCCEEDED")])).toBe(false);
    expect(canStartPayment([attempt("PARTIALLY_REFUNDED")])).toBe(false);
    expect(canStartPayment([])).toBe(true);
  });

  it("refunds only a captured amount within the original total", () => {
    expect(refundStatus(attempt("SUCCEEDED"), 100)).toBe("REFUNDED");
    expect(refundStatus(attempt("SUCCEEDED"), 40)).toBe("PARTIALLY_REFUNDED");
    expect(refundStatus(attempt("PARTIALLY_REFUNDED"), 40)).toBe("PARTIALLY_REFUNDED");
    expect(() => refundStatus(attempt("CREATED"), 40)).toThrow("payment_not_refundable");
    expect(() => refundStatus(attempt("SUCCEEDED"), 0)).toThrow("refund_out_of_range");
    expect(() => refundStatus(attempt("SUCCEEDED"), 101)).toThrow("refund_out_of_range");
  });

  it("times out only an open unpaid attempt whose expiry has passed", () => {
    const earlier = new Date("2026-09-12T10:14:59.000Z");
    const later = new Date("2026-09-12T10:15:01.000Z");
    expect(isPaymentTimedOut(attempt("CREATED"), later)).toBe(true);
    expect(isPaymentTimedOut(attempt("PENDING"), later)).toBe(true);
    expect(isPaymentTimedOut(attempt("CREATED"), earlier)).toBe(false);
    expect(isPaymentTimedOut(attempt("SUCCEEDED"), later)).toBe(false);
    expect(isPaymentTimedOut({ ...attempt("CREATED"), expiresAt: null }, later)).toBe(
      false,
    );
    expect(
      isPaymentTimedOut(attempt("CREATED"), new Date("2026-09-12T10:15:00.000Z")),
    ).toBe(true);
  });
});
