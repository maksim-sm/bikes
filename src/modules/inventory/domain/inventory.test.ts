import { describe, expect, it } from "vitest";
import {
  applyCommit,
  applyExternalMovement,
  applyRelease,
  canReserve,
  isExpired,
  sanitizeMovementNote,
  type InventoryItem,
  type Reservation,
} from "./inventory";

const item: InventoryItem = { id: "i1", variantId: "v1", onHand: 3, reserved: 1 };
const now = new Date("2026-09-13T12:00:00.000Z");

function reservation(overrides: Partial<Reservation> = {}): Reservation {
  return {
    id: "r1",
    inventoryItemId: "i1",
    quantity: 1,
    status: "ACTIVE",
    expiresAt: new Date("2026-09-13T11:59:00.000Z"),
    ...overrides,
  };
}

describe("reservation expiry", () => {
  it("is expired only while the hold is still ACTIVE and the clock has passed", () => {
    expect(isExpired(reservation(), now)).toBe(true);
    expect(
      isExpired(reservation({ expiresAt: new Date("2026-09-13T12:00:01.000Z") }), now),
    ).toBe(false);
    expect(isExpired(reservation({ status: "RELEASED" }), now)).toBe(false);
    expect(isExpired(reservation({ status: "COMMITTED" }), now)).toBe(false);
    expect(isExpired(reservation({ status: "EXPIRED" }), now)).toBe(false);
  });
});

describe("reservation counters", () => {
  it("refuses a release or commit that does not match reserved units", () => {
    expect(() => applyRelease(item, 2)).toThrow("reservation_counter_mismatch");
    expect(() => applyCommit(item, 2)).toThrow("reservation_counter_mismatch");
    expect(() => applyCommit({ ...item, reserved: 2, onHand: 1 }, 2)).toThrow(
      "reservation_counter_mismatch",
    );
    expect(applyRelease(item, 1).reserved).toBe(0);
    expect(applyCommit(item, 1)).toEqual({
      id: "i1",
      variantId: "v1",
      onHand: 2,
      reserved: 0,
    });
  });

  it("does not treat a non-positive quantity as reservable", () => {
    expect(canReserve(item, 0)).toBe(false);
    expect(canReserve(item, -1)).toBe(false);
    expect(canReserve(item, 1.5)).toBe(false);
    expect(canReserve(item, 2)).toBe(true);
  });
});

describe("movement notes and external writes", () => {
  it("normalizes, trims, and truncates a movement note", () => {
    expect(sanitizeMovementNote(undefined)).toBeNull();
    expect(sanitizeMovementNote("   ")).toBeNull();
    expect(sanitizeMovementNote("  приход  ")).toBe("приход");
    expect(sanitizeMovementNote("ﬁ")).toBe("fi");
    expect(sanitizeMovementNote("n".repeat(300))).toHaveLength(240);
  });

  it("routes receipts and returns onto on-hand and adjustments onto write-offs", () => {
    expect(applyExternalMovement(item, "RECEIPT", 2).onHand).toBe(5);
    expect(applyExternalMovement(item, "RETURN", 1).onHand).toBe(4);
    expect(applyExternalMovement(item, "ADJUSTMENT", 1).onHand).toBe(2);
    expect(() => applyExternalMovement(item, "ADJUSTMENT", 3)).toThrow(
      "adjustment_below_reserved",
    );
  });
});
