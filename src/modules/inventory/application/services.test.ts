import { describe, expect, it } from "vitest";
import { ConflictError, ForbiddenError } from "@/lib/errors";
import { customerPrincipal, staffPrincipal } from "@/modules/identity";
import {
  applyAdjustment,
  applyCommit,
  applyRelease,
  applyReserve,
  available,
  canReserve,
  nextReservationStatus,
} from "../domain/inventory";
import { createMemoryInventoryRepository } from "../infrastructure/memory-inventory";
import { isInsufficientAvailable, mapInventoryWriteError } from "./inventory-errors";
import { createInventoryServices } from "./services";

const now = new Date("2026-09-12T12:00:00.000Z");
const clerk = staffPrincipal("inv", ["inventory"]);
const manager = staffPrincipal("mgr", ["manager"]);

function services(onHand = 2, reserved = 0) {
  return createInventoryServices({
    inventory: createMemoryInventoryRepository([
      { id: "i1", variantId: "v1", onHand, reserved },
    ]),
    clock: { now: () => now },
  });
}

describe("inventory write errors", () => {
  it("maps the PostgreSQL oversell exception to a conflict", () => {
    const error = new Error("insufficient available inventory");
    expect(isInsufficientAvailable(error)).toBe(true);
    expect(() => mapInventoryWriteError(error)).toThrow(ConflictError);
  });
});

describe("inventory counters", () => {
  const item = { id: "i1", variantId: "v1", onHand: 2, reserved: 1 };

  it("derives available and refuses oversell in memory the same way as SQL", () => {
    expect(available(item)).toBe(1);
    expect(canReserve(item, 1)).toBe(true);
    expect(canReserve(item, 2)).toBe(false);
    expect(applyReserve(item, 1).reserved).toBe(2);
    expect(applyAdjustment(item, 1).onHand).toBe(1);
    expect(() => applyAdjustment(item, 2)).toThrow("adjustment_below_reserved");
  });

  it("only leaves ACTIVE through commit, release, or expire", () => {
    expect(nextReservationStatus("ACTIVE", "commit")).toBe("COMMITTED");
    expect(() => nextReservationStatus("COMMITTED", "release")).toThrow(
      "reservation_not_active",
    );
    expect(applyRelease(applyReserve(item, 1), 1).reserved).toBe(1);
    expect(applyCommit({ ...item, reserved: 1 }, 1)).toEqual({
      id: "i1",
      variantId: "v1",
      onHand: 1,
      reserved: 0,
    });
  });
});

describe("inventory services", () => {
  it("records receipt, reserve, commit, and return as a ledger", async () => {
    const inventory = services(0);
    expect(
      await inventory.receiveStock(clerk, {
        variantId: "v1",
        quantity: 2,
        note: "приход",
      }),
    ).toEqual({ onHand: 2, reserved: 0, available: 2 });
    const hold = await inventory.reserve({ variantId: "v1", quantity: 1, orderId: "o1" });
    await expect(
      inventory.reserve({ variantId: "v1", quantity: 2 }),
    ).rejects.toBeInstanceOf(ConflictError);
    await inventory.commit(hold.id);
    expect(await inventory.getAvailability("v1")).toEqual({
      onHand: 1,
      reserved: 0,
      available: 1,
    });
    await inventory.returnStock(clerk, { variantId: "v1", quantity: 1, note: "возврат" });
    expect((await inventory.listMovements("v1")).map((row) => row.type)).toEqual([
      "RECEIPT",
      "RESERVE",
      "COMMIT",
      "RETURN",
    ]);
  });

  it("adjusts write-offs without touching reserved units", async () => {
    const inventory = services(3);
    const hold = await inventory.reserve({ variantId: "v1", quantity: 2 });
    await expect(
      inventory.adjustStock(clerk, { variantId: "v1", quantity: 2 }),
    ).rejects.toBeInstanceOf(ConflictError);
    expect(
      await inventory.adjustStock(manager, { variantId: "v1", quantity: 1 }),
    ).toEqual({
      onHand: 2,
      reserved: 2,
      available: 0,
    });
    await inventory.release(hold.id);
    expect(await inventory.getAvailability("v1")).toEqual({
      onHand: 2,
      reserved: 0,
      available: 2,
    });
    expect((await inventory.listMovements("v1")).map((row) => row.type)).toEqual([
      "RESERVE",
      "ADJUSTMENT",
      "RELEASE",
    ]);
  });

  it("cancels an active hold and every hold on an order", async () => {
    const inventory = services(4);
    const first = await inventory.reserve({
      variantId: "v1",
      quantity: 1,
      orderId: "o9",
    });
    await inventory.reserve({ variantId: "v1", quantity: 2, orderId: "o9" });
    await inventory.cancel(first.id);
    expect(await inventory.cancelForOrder("o9")).toHaveLength(1);
    expect(await inventory.getAvailability("v1")).toEqual({
      onHand: 4,
      reserved: 0,
      available: 4,
    });
    await expect(inventory.cancel(first.id)).rejects.toBeInstanceOf(ConflictError);
  });

  it("commits every active hold for an order", async () => {
    const inventory = services(3);
    await inventory.reserve({ variantId: "v1", quantity: 1, orderId: "o2" });
    await inventory.reserve({ variantId: "v1", quantity: 1, orderId: "o2" });
    expect(await inventory.commitForOrder("o2")).toHaveLength(2);
    expect(await inventory.getAvailability("v1")).toEqual({
      onHand: 1,
      reserved: 0,
      available: 1,
    });
  });

  it("releases an order hold only once if expire and cancel race", async () => {
    const inventory = services(1);
    await inventory.reserve({
      variantId: "v1",
      quantity: 1,
      orderId: "o-race",
      holdMs: -1,
    });
    expect(await inventory.expireDue()).toBe(1);
    expect(await inventory.cancelForOrder("o-race")).toEqual([]);
    expect(await inventory.getAvailability("v1")).toEqual({
      onHand: 1,
      reserved: 0,
      available: 1,
    });
    expect((await inventory.listMovements("v1")).map((row) => row.type)).toEqual([
      "RESERVE",
      "EXPIRE",
    ]);
  });

  it("expires due holds and restores available", async () => {
    const inventory = services(1);
    await inventory.reserve({ variantId: "v1", quantity: 1, holdMs: -1 });
    expect(await inventory.expireDue()).toBe(1);
    expect(await inventory.getAvailability("v1")).toEqual({
      onHand: 1,
      reserved: 0,
      available: 1,
    });
    expect((await inventory.listMovements("v1")).map((row) => row.type)).toEqual([
      "RESERVE",
      "EXPIRE",
    ]);
  });

  it("lets only inventory-capable staff receive, adjust, or return stock", async () => {
    const inventory = services(1);
    await expect(
      inventory.receiveStock(customerPrincipal("u1"), { variantId: "v1", quantity: 2 }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      inventory.adjustStock(staffPrincipal("ops", ["order_management"]), {
        variantId: "v1",
        quantity: 1,
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      inventory.returnStock(staffPrincipal("ops", ["order_management"]), {
        variantId: "v1",
        quantity: 1,
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(await inventory.receiveStock(clerk, { variantId: "v1", quantity: 2 })).toEqual(
      { onHand: 3, reserved: 0, available: 3 },
    );
  });
});
