import { describe, expect, it } from "vitest";
import {
  assertCheckoutCustomer,
  assertCheckoutDestination,
  assertCheckoutPayment,
  checkoutTotals,
} from "./checkout";

describe("checkout domain", () => {
  it("normalizes customer fields and rejects invalid contact data", () => {
    expect(
      assertCheckoutCustomer({
        customerEmail: " Ira@Example.BY ",
        customerName: " Ира ",
        customerPhone: "+375 29 111 22 33",
      }),
    ).toEqual({
      customerEmail: "ira@example.by",
      customerName: "Ира",
      customerPhone: "+375 29 111 22 33",
    });
    expect(() =>
      assertCheckoutCustomer({
        customerEmail: "ira",
        customerName: "Ира",
        customerPhone: "+375291112233",
      }),
    ).toThrow("checkout_email_invalid");
    expect(() =>
      assertCheckoutDestination({
        recipientName: "Ира",
        phone: "+375291112233",
        region: "Минск",
        city: "  ",
        street: "1",
        postalCode: "220000",
      }),
    ).toThrow("checkout_city_required");
  });

  it("adds line totals and delivery without a client total argument", () => {
    expect(checkoutTotals([699800], 2500)).toEqual({
      subtotalMinor: 699800,
      deliveryCostMinor: 2500,
      totalMinor: 702300,
    });
    expect(() => checkoutTotals([100], -1)).toThrow("checkout_delivery_cost_invalid");
    expect(() => checkoutTotals([-1], 0)).toThrow("checkout_line_total_invalid");
    expect(() => checkoutTotals([10.5], 0)).toThrow("checkout_line_total_invalid");
    expect(() => checkoutTotals([100], 1.25)).toThrow("checkout_delivery_cost_invalid");
  });

  it("requires every destination field after trim", () => {
    const destination = {
      recipientName: "Ира",
      phone: "+375291112233",
      region: "Минск",
      city: "Минск",
      street: "1",
      postalCode: "220000",
    };
    expect(assertCheckoutDestination(destination)).toEqual(destination);
    expect(() =>
      assertCheckoutDestination({ ...destination, recipientName: "  " }),
    ).toThrow("checkout_recipient_required");
    expect(() => assertCheckoutDestination({ ...destination, phone: "" })).toThrow(
      "checkout_shipping_phone_required",
    );
    expect(() => assertCheckoutDestination({ ...destination, region: " " })).toThrow(
      "checkout_region_required",
    );
    expect(() => assertCheckoutDestination({ ...destination, street: "" })).toThrow(
      "checkout_street_required",
    );
    expect(() => assertCheckoutDestination({ ...destination, postalCode: "" })).toThrow(
      "checkout_postal_code_required",
    );
  });

  it("rejects a customer phone with fewer than six digits", () => {
    expect(() =>
      assertCheckoutCustomer({
        customerEmail: "ira@example.by",
        customerName: "Ира",
        customerPhone: "12345",
      }),
    ).toThrow("checkout_phone_invalid");
  });

  it("accepts only known payment methods", () => {
    expect(assertCheckoutPayment("cash_on_delivery")).toBe("cash_on_delivery");
    expect(() => assertCheckoutPayment("forged-free")).toThrow(
      "checkout_payment_invalid",
    );
  });
});
