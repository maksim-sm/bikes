import { describe, expect, it } from "vitest";
import { createPricingServices } from "./services";
import { lineTotalMinor, orderTotalMinor } from "../domain/money";

describe("pricing money", () => {
  it("multiplies unit price and quantity in integer kopeks", () => {
    expect(lineTotalMinor(349900, 2)).toBe(699800);
  });

  it("rejects float money", () => {
    expect(() => lineTotalMinor(10.5, 1)).toThrow(/integer/);
  });

  it("sums subtotal and delivery without floats", () => {
    expect(orderTotalMinor(699800, 2500)).toBe(702300);
  });
});

describe("pricing services", () => {
  it("totals a cart from line snapshots", () => {
    const pricing = createPricingServices();
    expect(
      pricing.cartSubtotal([
        { unitPriceMinor: 100, quantity: 2 },
        { unitPriceMinor: 50, quantity: 1 },
      ]),
    ).toBe(250);
    expect(pricing.currency()).toBe("BYN");
  });
});
