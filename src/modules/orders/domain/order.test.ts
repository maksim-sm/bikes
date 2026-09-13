import { describe, expect, it } from "vitest";
import {
  formatOrderNumber,
  paymentEventConfirmsHold,
  paymentEventReleasesReservation,
  paymentEventRequiresHold,
  projectFulfillmentStatus,
  projectPaymentStatus,
  transitionOrder,
  type PaymentProjectionEvent,
} from "./order";

describe("order status machine", () => {
  it("completes or cancels only an open order", () => {
    expect(transitionOrder("PLACED", "complete")).toBe("COMPLETED");
    expect(transitionOrder("PLACED", "cancel")).toBe("CANCELLED");
    expect(() => transitionOrder("COMPLETED", "cancel")).toThrow("order_not_open");
    expect(() => transitionOrder("CANCELLED", "complete")).toThrow("order_not_open");
  });

  it("formats a day-scoped order number from the placement clock", () => {
    expect(formatOrderNumber(new Date("2026-09-13T08:00:00.000Z"), 7)).toBe(
      "B-20260913-0007",
    );
  });
});

describe("payment and fulfillment projections", () => {
  it("maps every payment event onto the stored payment status", () => {
    const events: PaymentProjectionEvent["type"][] = [
      "created",
      "pending",
      "authorized",
      "succeeded",
      "failed",
      "expired",
      "cancelled",
      "refund_pending",
      "refunded",
      "partially_refunded",
    ];
    expect(events.map((type) => projectPaymentStatus({ type }))).toEqual([
      "CREATED",
      "PENDING",
      "AUTHORIZED",
      "SUCCEEDED",
      "FAILED",
      "EXPIRED",
      "CANCELLED",
      "REFUND_PENDING",
      "REFUNDED",
      "PARTIALLY_REFUNDED",
    ]);
  });

  it("maps fulfillment events and hold side-effects independently of order status", () => {
    expect(projectFulfillmentStatus({ type: "assigned" })).toBe("ASSIGNED");
    expect(projectFulfillmentStatus({ type: "shipped" })).toBe("SHIPPED");
    expect(projectFulfillmentStatus({ type: "delivered" })).toBe("DELIVERED");
    expect(projectFulfillmentStatus({ type: "failed" })).toBe("FAILED");
    expect(projectFulfillmentStatus({ type: "cancelled" })).toBe("CANCELLED");
    expect(paymentEventRequiresHold("created")).toBe(true);
    expect(paymentEventRequiresHold("pending")).toBe(false);
    expect(paymentEventConfirmsHold("authorized")).toBe(true);
    expect(paymentEventConfirmsHold("succeeded")).toBe(true);
    expect(paymentEventConfirmsHold("created")).toBe(false);
    expect(paymentEventReleasesReservation("failed")).toBe(true);
    expect(paymentEventReleasesReservation("expired")).toBe(true);
    expect(paymentEventReleasesReservation("cancelled")).toBe(true);
    expect(paymentEventReleasesReservation("succeeded")).toBe(false);
  });
});
