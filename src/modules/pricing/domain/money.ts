/**
 * Integer-only money helpers (kopeks). Domain code never uses floats.
 */

export const BYN = "BYN" as const;
export type Currency = typeof BYN;

export function assertNonNegativeMinor(amountMinor: number, label: string): void {
  if (!Number.isInteger(amountMinor) || amountMinor < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
}

export function assertPositiveMinor(amountMinor: number, label: string): void {
  if (!Number.isInteger(amountMinor) || amountMinor <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
}

export function lineTotalMinor(unitPriceMinor: number, quantity: number): number {
  assertNonNegativeMinor(unitPriceMinor, "unit price");
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("quantity must be a positive integer");
  }
  return unitPriceMinor * quantity;
}

export function sumMinor(amounts: readonly number[]): number {
  let total = 0;
  for (const amount of amounts) {
    assertNonNegativeMinor(amount, "amount");
    total += amount;
  }
  return total;
}

export function orderTotalMinor(
  subtotalMinor: number,
  deliveryCostMinor: number,
): number {
  assertNonNegativeMinor(subtotalMinor, "subtotal");
  assertNonNegativeMinor(deliveryCostMinor, "delivery cost");
  return subtotalMinor + deliveryCostMinor;
}
