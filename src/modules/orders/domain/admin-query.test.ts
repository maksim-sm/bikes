import { describe, expect, it } from "vitest";
import { normalizeStaffNotes, orderMatchesAdminQuery, type Order } from "./order";

function order(overrides: Partial<Order> = {}): Order {
  return {
    id: "dddddddd-dddd-dddd-dddd-dddddddddddd",
    number: "B-20260912-0001",
    userId: "u1",
    status: "PLACED",
    paymentStatus: "SUCCEEDED",
    fulfillmentStatus: "SHIPPED",
    currency: "BYN",
    subtotalMinor: 1000,
    deliveryCostMinor: 0,
    totalMinor: 1000,
    deliveryMethodCode: "minsk-courier",
    deliveryMethodName: "Курьер",
    customerEmail: "anna@example.by",
    customerName: "Анна Ковалева",
    customerPhone: "+375291112233",
    paymentMethodCode: "cash_on_delivery",
    staffNotes: "позвонить",
    shipping: {
      recipientName: "Анна",
      phone: "+375291112233",
      countryCode: "BY",
      region: "Минск",
      city: "Минск",
      street: "1",
      postalCode: "220000",
    },
    items: [
      {
        variantId: "v1",
        sku: "EM-M-BLK",
        productName: "Émonda",
        brandName: "Trek",
        frameSize: "M",
        color: "чёрный",
        quantity: 1,
        unitPriceMinor: 1000,
        lineTotalMinor: 1000,
      },
    ],
    ...overrides,
  };
}

describe("admin order query", () => {
  it("matches number, contact, sku, and phone digits", () => {
    const row = order();
    expect(orderMatchesAdminQuery(row, { q: "B-20260912-0001" })).toBe(true);
    expect(orderMatchesAdminQuery(row, { q: "anna@example.by" })).toBe(true);
    expect(orderMatchesAdminQuery(row, { q: "EM-M-BLK" })).toBe(true);
    expect(orderMatchesAdminQuery(row, { q: "375291112233" })).toBe(true);
    expect(orderMatchesAdminQuery(row, { q: "нет такого" })).toBe(false);
    expect(orderMatchesAdminQuery(row, { status: "CANCELLED" })).toBe(false);
    expect(orderMatchesAdminQuery(row, { paymentStatus: "SUCCEEDED" })).toBe(true);
  });

  it("trims staff notes and rejects overly long text", () => {
    expect(normalizeStaffNotes("  x  ")).toBe("x");
    expect(normalizeStaffNotes("   ")).toBeNull();
    expect(() => normalizeStaffNotes("n".repeat(2001))).toThrow("staff_notes_too_long");
  });
});
