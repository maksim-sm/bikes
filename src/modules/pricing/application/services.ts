import {
  lineTotalMinor,
  orderTotalMinor,
  sumMinor,
  type Currency,
} from "../domain/money";

export interface PricingServices {
  lineTotal(unitPriceMinor: number, quantity: number): number;
  cartSubtotal(lines: readonly { unitPriceMinor: number; quantity: number }[]): number;
  orderTotal(subtotalMinor: number, deliveryCostMinor: number): number;
  currency(): Currency;
}

export function createPricingServices(): PricingServices {
  return {
    lineTotal: lineTotalMinor,
    cartSubtotal(lines) {
      return sumMinor(
        lines.map((line) => lineTotalMinor(line.unitPriceMinor, line.quantity)),
      );
    },
    orderTotal: orderTotalMinor,
    currency: () => "BYN",
  };
}
