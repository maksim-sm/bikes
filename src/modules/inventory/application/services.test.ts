import { describe, expect, it } from "vitest";
import { ConflictError, ForbiddenError } from "@/lib/errors";
import { customerPrincipal, staffPrincipal } from "@/modules/identity";
import {
  applyCommit,
  applyRelease,
  applyReserve,
  available,
  canReserve,
  nextReservationStatus,
  type InventoryItem,
  type Reservation,
} from "../domain/inventory";
import type { InventoryRepository } from "./ports";
import { createInventoryServices } from "./services";

const now = new Date("2026-09-12T12:00:00.000Z");

function memoryInventory(initial: InventoryItem): InventoryRepository {
  const items = new Map<string, InventoryItem>([[initial.id, { ...initial }]]);
  const byVariant = new Map<string, string>([[initial.variantId, initial.id]]);
  const reservations = new Map<string, Reservation>();
  let seq = 0;

  function itemOrThrow(id: string): InventoryItem {
    const item = items.get(id);
    if (!item) {
      throw new Error("missing item");
    }
    return item;
  }

  return {
    async getByVariantId(variantId) {
      const id = byVariant.get(variantId);
      return id ? (items.get(id) ?? null) : null;
    },
    async getByItemId(id) {
      return items.get(id) ?? null;
    },
    async saveItem(item) {
      items.set(item.id, item);
      return item;
    },
    async insertActive(input) {
      items.set(
        input.inventoryItemId,
        applyReserve(itemOrThrow(input.inventoryItemId), input.quantity),
      );
      seq += 1;
      const reservation: Reservation = {
        id: `r${seq}`,
        inventoryItemId: input.inventoryItemId,
        quantity: input.quantity,
        status: "ACTIVE",
        expiresAt: input.expiresAt,
      };
      reservations.set(reservation.id, reservation);
      return reservation;
    },
    async getReservation(id) {
      return reservations.get(id) ?? null;
    },
    async saveReservation(reservation) {
      const previous = reservations.get(reservation.id);
      if (previous && previous.status === "ACTIVE" && reservation.status !== "ACTIVE") {
        const item = itemOrThrow(reservation.inventoryItemId);
        const next =
          reservation.status === "COMMITTED"
            ? applyCommit(item, reservation.quantity)
            : applyRelease(item, reservation.quantity);
        items.set(item.id, next);
      }
      reservations.set(reservation.id, reservation);
      return reservation;
    },
    async listInStockVariantIds() {
      return [...items.values()]
        .filter((item) => item.onHand - item.reserved > 0)
        .map((item) => item.variantId);
    },
    async listAvailabilityByVariantIds(variantIds) {
      const wanted = new Set(variantIds);
      return [...items.values()]
        .filter((item) => wanted.has(item.variantId))
        .map((item) => ({
          variantId: item.variantId,
          available: item.onHand - item.reserved,
        }));
    },
    async listDueActive(at) {
      return [...reservations.values()].filter(
        (row) => row.status === "ACTIVE" && row.expiresAt.getTime() <= at.getTime(),
      );
    },
  };
}

describe("inventory counters", () => {
  const item: InventoryItem = { id: "i1", variantId: "v1", onHand: 2, reserved: 1 };

  it("derives available and refuses oversell in memory the same way as SQL", () => {
    expect(available(item)).toBe(1);
    expect(canReserve(item, 1)).toBe(true);
    expect(canReserve(item, 2)).toBe(false);
    expect(applyReserve(item, 1).reserved).toBe(2);
  });

  it("only leaves ACTIVE through commit, release, or expire", () => {
    expect(nextReservationStatus("ACTIVE", "commit")).toBe("COMMITTED");
    expect(() => nextReservationStatus("COMMITTED", "release")).toThrow(
      "reservation_not_active",
    );
  });
});

describe("inventory services", () => {
  it("reserves then commits without application-only leftover stock", async () => {
    const inventory = createInventoryServices({
      inventory: memoryInventory({ id: "i1", variantId: "v1", onHand: 1, reserved: 0 }),
      clock: { now: () => now },
    });
    const hold = await inventory.reserve({ variantId: "v1", quantity: 1 });
    await expect(
      inventory.reserve({ variantId: "v1", quantity: 1 }),
    ).rejects.toBeInstanceOf(ConflictError);
    await inventory.commit(hold.id);
    expect(await inventory.getAvailability("v1")).toEqual({
      onHand: 0,
      reserved: 0,
      available: 0,
    });
  });

  it("expires due holds and restores available", async () => {
    const inventory = createInventoryServices({
      inventory: memoryInventory({ id: "i1", variantId: "v1", onHand: 1, reserved: 0 }),
      clock: { now: () => now },
    });
    await inventory.reserve({ variantId: "v1", quantity: 1, holdMs: -1 });
    expect(await inventory.expireDue()).toBe(1);
    expect(await inventory.getAvailability("v1")).toEqual({
      onHand: 1,
      reserved: 0,
      available: 1,
    });
  });

  it("lets only the inventory role receive stock", async () => {
    const inventory = createInventoryServices({
      inventory: memoryInventory({ id: "i1", variantId: "v1", onHand: 1, reserved: 0 }),
      clock: { now: () => now },
    });
    await expect(
      inventory.receiveStock(customerPrincipal("u1"), { variantId: "v1", quantity: 2 }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      inventory.receiveStock(staffPrincipal("ops", ["order_management"]), {
        variantId: "v1",
        quantity: 2,
      }),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(
      await inventory.receiveStock(staffPrincipal("inv", ["inventory"]), {
        variantId: "v1",
        quantity: 2,
      }),
    ).toEqual({ onHand: 3, reserved: 0, available: 3 });
  });
});
