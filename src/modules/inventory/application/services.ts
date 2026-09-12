import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { requireInventoryRole, type Principal } from "@/modules/identity";
import {
  assertPositiveQuantity,
  available,
  canReserve,
  nextReservationStatus,
  sanitizeMovementNote,
  type ExternalMovementType,
  type Movement,
  type Reservation,
} from "../domain/inventory";
import type { Clock, InventoryRepository } from "./ports";

const DEFAULT_HOLD_MS = 15 * 60 * 1000;

export interface StockSnapshot {
  onHand: number;
  reserved: number;
  available: number;
}

export interface InventoryServices {
  getAvailability(variantId: string): Promise<StockSnapshot>;
  listMovements(variantId: string): Promise<Movement[]>;
  receiveStock(
    principal: Principal,
    input: { variantId: string; quantity: number; note?: string },
  ): Promise<StockSnapshot>;
  adjustStock(
    principal: Principal,
    input: { variantId: string; quantity: number; note?: string },
  ): Promise<StockSnapshot>;
  returnStock(
    principal: Principal,
    input: { variantId: string; quantity: number; note?: string },
  ): Promise<StockSnapshot>;
  reserve(input: {
    variantId: string;
    quantity: number;
    cartId?: string;
    orderId?: string;
    holdMs?: number;
  }): Promise<Reservation>;
  release(reservationId: string): Promise<Reservation>;
  commit(reservationId: string): Promise<Reservation>;
  cancel(reservationId: string): Promise<Reservation>;
  cancelForOrder(orderId: string): Promise<Reservation[]>;
  commitForOrder(orderId: string): Promise<Reservation[]>;
  expireDue(): Promise<number>;
  listInStockVariantIds(): Promise<string[]>;
  listAvailabilityByVariantIds(
    variantIds: readonly string[],
  ): Promise<Array<{ variantId: string; available: number }>>;
}

/**
 * Application code inserts reservation rows and RECEIPT/ADJUSTMENT/RETURN
 * movements. Counter changes happen in the repository (PostgreSQL triggers
 * in production, the same domain functions in tests).
 */
export function createInventoryServices(deps: {
  inventory: InventoryRepository;
  clock: Clock;
}): InventoryServices {
  async function snapshot(variantId: string): Promise<StockSnapshot> {
    const item = await requireItem(deps.inventory, variantId);
    return {
      onHand: item.onHand,
      reserved: item.reserved,
      available: available(item),
    };
  }

  async function writeExternal(
    principal: Principal,
    type: ExternalMovementType,
    input: { variantId: string; quantity: number; note?: string },
  ): Promise<StockSnapshot> {
    requireInventoryRole(principal);
    try {
      assertPositiveQuantity(input.quantity);
    } catch {
      throw new ValidationError("quantity must be a positive integer");
    }
    const item = await requireItem(deps.inventory, input.variantId);
    try {
      await deps.inventory.insertExternalMovement({
        inventoryItemId: item.id,
        type,
        quantity: input.quantity,
        note: sanitizeMovementNote(input.note),
        now: deps.clock.now(),
      });
    } catch (error) {
      if (error instanceof Error && error.message === "adjustment_below_reserved") {
        throw new ConflictError("adjustment would drop on-hand below reserved", {
          variantId: input.variantId,
        });
      }
      throw error;
    }
    return snapshot(input.variantId);
  }

  return {
    async getAvailability(variantId) {
      return snapshot(variantId);
    },

    async listMovements(variantId) {
      const item = await requireItem(deps.inventory, variantId);
      return deps.inventory.listMovements(item.id);
    },

    async receiveStock(principal, input) {
      return writeExternal(principal, "RECEIPT", input);
    },

    async adjustStock(principal, input) {
      return writeExternal(principal, "ADJUSTMENT", input);
    },

    async returnStock(principal, input) {
      return writeExternal(principal, "RETURN", input);
    },

    async reserve(input) {
      try {
        assertPositiveQuantity(input.quantity);
      } catch {
        throw new ValidationError("quantity must be a positive integer");
      }
      const item = await requireItem(deps.inventory, input.variantId);
      if (!canReserve(item, input.quantity)) {
        throw new ConflictError("insufficient available inventory", {
          variantId: input.variantId,
        });
      }
      const holdMs = input.holdMs ?? DEFAULT_HOLD_MS;
      return deps.inventory.insertActive({
        inventoryItemId: item.id,
        quantity: input.quantity,
        expiresAt: new Date(deps.clock.now().getTime() + holdMs),
        ...(input.cartId !== undefined ? { cartId: input.cartId } : {}),
        ...(input.orderId !== undefined ? { orderId: input.orderId } : {}),
      });
    },

    async release(reservationId) {
      return transition(deps, reservationId, "release");
    },

    async commit(reservationId) {
      return transition(deps, reservationId, "commit");
    },

    async cancel(reservationId) {
      return transition(deps, reservationId, "release");
    },

    async cancelForOrder(orderId) {
      const holds = await deps.inventory.listActiveByOrder(orderId);
      const released: Reservation[] = [];
      for (const hold of holds) {
        released.push(await transition(deps, hold.id, "release"));
      }
      return released;
    },

    async commitForOrder(orderId) {
      const holds = await deps.inventory.listActiveByOrder(orderId);
      const committed: Reservation[] = [];
      for (const hold of holds) {
        committed.push(await transition(deps, hold.id, "commit"));
      }
      return committed;
    },

    async listInStockVariantIds() {
      return deps.inventory.listInStockVariantIds();
    },

    async listAvailabilityByVariantIds(variantIds) {
      return deps.inventory.listAvailabilityByVariantIds(variantIds);
    },

    async expireDue() {
      if (deps.inventory.expireDue) {
        return deps.inventory.expireDue(deps.clock.now());
      }
      const due = await deps.inventory.listDueActive(deps.clock.now());
      for (const reservation of due) {
        await deps.inventory.saveReservation({
          ...reservation,
          status: nextReservationStatus(reservation.status, "expire"),
        });
      }
      return due.length;
    },
  };
}

async function requireItem(inventory: InventoryRepository, variantId: string) {
  const item = await inventory.getByVariantId(variantId);
  if (!item) {
    throw new NotFoundError("inventory item not found", { variantId });
  }
  return item;
}

async function transition(
  deps: { inventory: InventoryRepository },
  reservationId: string,
  action: "commit" | "release",
): Promise<Reservation> {
  const reservation = await deps.inventory.getReservation(reservationId);
  if (!reservation) {
    throw new NotFoundError("reservation not found", { reservationId });
  }
  try {
    const status = nextReservationStatus(reservation.status, action);
    return deps.inventory.saveReservation({ ...reservation, status });
  } catch {
    throw new ConflictError("reservation is not active", { reservationId });
  }
}
