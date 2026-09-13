import { describe, expect, it } from "vitest";
import {
  assertNonNegativeMinor,
  assertPositiveMinor,
  lineTotalMinor,
  orderTotalMinor,
  sumMinor,
} from "./money";

describe("integer money guards", () => {
  it("rejects floats and negatives before any arithmetic", () => {
    expect(() => assertNonNegativeMinor(-1, "amount")).toThrow(
      "amount must be a non-negative integer",
    );
    expect(() => assertNonNegativeMinor(1.5, "amount")).toThrow(
      "amount must be a non-negative integer",
    );
    expect(() => assertPositiveMinor(0, "price")).toThrow(
      "price must be a positive integer",
    );
    expect(() => assertPositiveMinor(-10, "price")).toThrow(
      "price must be a positive integer",
    );
    expect(() => assertPositiveMinor(10.25, "price")).toThrow(
      "price must be a positive integer",
    );
  });

  it("allows a zero kopek amount where the rule is non-negative", () => {
    expect(() => assertNonNegativeMinor(0, "amount")).not.toThrow();
    expect(lineTotalMinor(0, 3)).toBe(0);
  });
});

describe("line and order totals", () => {
  it("multiplies unit price by a positive integer quantity", () => {
    expect(lineTotalMinor(349_900, 2)).toBe(699_800);
  });

  it("rejects a zero or fractional quantity on a line", () => {
    expect(() => lineTotalMinor(100, 0)).toThrow("quantity must be a positive integer");
    expect(() => lineTotalMinor(100, -1)).toThrow("quantity must be a positive integer");
    expect(() => lineTotalMinor(100, 1.5)).toThrow("quantity must be a positive integer");
  });

  it("sums an empty list to zero and rejects a negative addend", () => {
    expect(sumMinor([])).toBe(0);
    expect(sumMinor([100, 0, 50])).toBe(150);
    expect(() => sumMinor([100, -1])).toThrow("amount must be a non-negative integer");
    expect(() => sumMinor([10.5])).toThrow("amount must be a non-negative integer");
  });

  it("adds delivery without accepting a negative subtotal or cost", () => {
    expect(orderTotalMinor(699_800, 2_500)).toBe(702_300);
    expect(orderTotalMinor(0, 0)).toBe(0);
    expect(() => orderTotalMinor(-1, 0)).toThrow(
      "subtotal must be a non-negative integer",
    );
    expect(() => orderTotalMinor(100, -1)).toThrow(
      "delivery cost must be a non-negative integer",
    );
    expect(() => orderTotalMinor(100.5, 0)).toThrow(
      "subtotal must be a non-negative integer",
    );
  });
});
