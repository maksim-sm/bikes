import { describe, expect, it } from "vitest";
import { detectOrderAnomalies } from "./anomalies";
import type { Order } from "./order";

function order(overrides: Partial<Order>): Order {
  return {
    id: "o1",
    number: "B-1",
    userId: null,
    status: "PLACED",
    paymentStatus: "SUCCEEDED",
    fulfillmentStatus: "UNFULFILLED",
    currency: "BYN",
    subtotalMinor: 100,
    deliveryCostMinor: 0,
    totalMinor: 100,
    deliveryMethodCode: "minsk-courier",
    deliveryMethodName: "Курьер",
    customerEmail: "a@b.by",
    customerName: "A",
    customerPhone: "+37529",
    paymentMethodCode: "bank_transfer",
    staffNotes: null,
    shipping: {
      recipientName: "A",
      phone: "+37529",
      countryCode: "BY",
      region: "Минск",
      city: "Минск",
      street: "1",
      postalCode: "220000",
    },
    items: [],
    ...overrides,
  };
}

describe("order anomalies", () => {
  it("flags paid-cancelled, paid-without-hold, and unpaid shipment", () => {
    const cancelled = order({ id: "c1", number: "B-C", status: "CANCELLED" });
    const placed = order({ id: "p1", number: "B-P" });
    const shipped = order({
      id: "s1",
      number: "B-S",
      fulfillmentStatus: "SHIPPED",
      paymentStatus: "PENDING",
    });
    const anomalies = detectOrderAnomalies({
      orders: [cancelled, placed, shipped],
      paymentStatuses: new Map([
        ["c1", ["SUCCEEDED"]],
        ["p1", ["SUCCEEDED"]],
        ["s1", ["PENDING"]],
      ]),
      hasActiveHold: new Map([
        ["c1", false],
        ["p1", false],
        ["s1", true],
      ]),
    });
    expect(anomalies.map((row) => row.code)).toEqual([
      "succeeded_payment_on_cancelled_order",
      "succeeded_payment_without_hold",
      "shipped_without_success",
    ]);
  });

  it("does not flag cash-on-delivery shipments", () => {
    const shipped = order({
      id: "cod",
      paymentMethodCode: "cash_on_delivery",
      fulfillmentStatus: "SHIPPED",
      paymentStatus: "PENDING",
    });
    expect(
      detectOrderAnomalies({
        orders: [shipped],
        paymentStatuses: new Map([["cod", ["PENDING"]]]),
        hasActiveHold: new Map([["cod", true]]),
      }),
    ).toEqual([]);
  });
});
