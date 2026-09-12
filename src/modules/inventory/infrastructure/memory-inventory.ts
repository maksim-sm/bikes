import {
  applyCommit,
  applyExternalMovement,
  applyRelease,
  applyReserve,
  type InventoryItem,
  type Movement,
  type Reservation,
} from "../domain/inventory";
import type { InventoryRepository } from "../application/ports";

export function createMemoryInventoryRepository(
  initial: InventoryItem[] = [],
): InventoryRepository {
  const items = new Map<string, InventoryItem>();
  const byVariant = new Map<string, string>();
  const reservations = new Map<string, Reservation>();
  const movements: Movement[] = [];
  let seq = 0;

  for (const item of initial) {
    items.set(item.id, { ...item });
    byVariant.set(item.variantId, item.id);
  }

  function itemOrThrow(id: string): InventoryItem {
    const item = items.get(id);
    if (!item) {
      throw new Error("missing item");
    }
    return item;
  }

  function record(
    item: InventoryItem,
    input: {
      type: Movement["type"];
      quantity: number;
      reservationId: string | null;
      note: string | null;
      actorUserId?: string | null;
      now: Date;
    },
  ): Movement {
    seq += 1;
    const movement: Movement = {
      id: `m${seq}`,
      inventoryItemId: item.id,
      reservationId: input.reservationId,
      type: input.type,
      quantity: input.quantity,
      onHandAfter: item.onHand,
      reservedAfter: item.reserved,
      note: input.note,
      actorUserId: input.actorUserId ?? null,
      createdAt: input.now,
    };
    movements.push(movement);
    return movement;
  }

  return {
    async getByVariantId(variantId) {
      const id = byVariant.get(variantId);
      return id ? (items.get(id) ?? null) : null;
    },
    async getByItemId(id) {
      return items.get(id) ?? null;
    },
    async insertActive(input) {
      const next = applyReserve(itemOrThrow(input.inventoryItemId), input.quantity);
      items.set(next.id, next);
      seq += 1;
      const reservation: Reservation = {
        id: `r${seq}`,
        inventoryItemId: input.inventoryItemId,
        quantity: input.quantity,
        status: "ACTIVE",
        expiresAt: input.expiresAt,
        ...(input.cartId !== undefined ? { cartId: input.cartId } : {}),
        ...(input.orderId !== undefined ? { orderId: input.orderId } : {}),
      };
      reservations.set(reservation.id, reservation);
      record(next, {
        type: "RESERVE",
        quantity: input.quantity,
        reservationId: reservation.id,
        note: null,
        now: input.expiresAt,
      });
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
        record(next, {
          type:
            reservation.status === "COMMITTED"
              ? "COMMIT"
              : reservation.status === "EXPIRED"
                ? "EXPIRE"
                : "RELEASE",
          quantity: reservation.quantity,
          reservationId: reservation.id,
          note: null,
          now: reservation.expiresAt,
        });
      }
      reservations.set(reservation.id, reservation);
      return reservation;
    },
    async listDueActive(at) {
      return [...reservations.values()].filter(
        (row) => row.status === "ACTIVE" && row.expiresAt.getTime() <= at.getTime(),
      );
    },
    async listActiveByOrder(orderId) {
      return [...reservations.values()].filter(
        (row) => row.status === "ACTIVE" && row.orderId === orderId,
      );
    },
    async insertExternalMovement(input) {
      const next = applyExternalMovement(
        itemOrThrow(input.inventoryItemId),
        input.type,
        input.quantity,
      );
      items.set(next.id, next);
      return record(next, {
        type: input.type,
        quantity: input.quantity,
        reservationId: null,
        note: input.note,
        actorUserId: input.actorUserId,
        now: input.now,
      });
    },
    async listItems() {
      return [...items.values()].map((item) => ({ ...item }));
    },
    async listMovements(inventoryItemId) {
      return movements.filter((row) => row.inventoryItemId === inventoryItemId);
    },
    async listRecentMovements(limit) {
      return [...movements]
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
        .slice(0, limit);
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
  };
}
