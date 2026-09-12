import { describe, expect, it } from "vitest";
import { paymentAttemptIdempotencyKey, refundIdempotencyKey } from "./provider";
import { normalizePaymentStatus, paymentStatusToOrderEvent } from "./status";

describe("normalizePaymentStatus", () => {
  it("passes through already-normalized values", () => {
    expect(normalizePaymentStatus("PENDING")).toBe("PENDING");
    expect(normalizePaymentStatus("succeeded")).toBe("SUCCEEDED");
    expect(normalizePaymentStatus("partially-refunded")).toBe("PARTIALLY_REFUNDED");
  });

  it("maps common provider aliases", () => {
    expect(normalizePaymentStatus("paid")).toBe("SUCCEEDED");
    expect(normalizePaymentStatus("declined")).toBe("FAILED");
    expect(normalizePaymentStatus("canceled")).toBe("CANCELLED");
    expect(normalizePaymentStatus("processing")).toBe("PENDING");
  });

  it("rejects unknown provider strings", () => {
    expect(() => normalizePaymentStatus("settled_in_escrow")).toThrow(
      "unknown_provider_status",
    );
  });
});

describe("payment identifiers", () => {
  it("builds stable attempt and refund keys", () => {
    expect(paymentAttemptIdempotencyKey("ord-1", 2)).toBe("pay:ord-1:2");
    expect(refundIdempotencyKey("pay-1", 2500)).toBe("refund:pay-1:2500");
    expect(paymentStatusToOrderEvent("PENDING")).toBeNull();
    expect(paymentStatusToOrderEvent("PARTIALLY_REFUNDED")).toEqual({
      type: "partially_refunded",
    });
  });
});
