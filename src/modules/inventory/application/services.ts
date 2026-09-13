import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { actorUserId, requireInventoryRole, type Principal } from "@/modules/identity";
import {
  detectInventoryAnomalies,
  type InventoryAnomaly,
} from "../domain/anomalies";
import {
  assertPositiveQuantity,
  available,
  nextReservationStatus,
  sanitizeMovementNote,
  type ExternalMovementType,
  type Movement,
  type Reservation,
} from "../domain/inventory";
import { mapInventoryWriteError } from "./inventory-errors";
import type { Clock, InventoryRepository } from "./ports";

const DEFAULT_HOLD_MS = 15 * 60 * 1000;
const CONFIRMED_HOLD_MS = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_RECENT_MOVEMENTS = 50;

export interface StockSnapshot {
  onHand: number;
  reserved: number;
  available: number;
}

export interface StockRow extends StockSnapshot {
  variantId: string;
}

export interface StaffMovement extends Movement {
  variantId: string;
}

export interface InventoryServices {
  getAvailability(variantId: string): Promise<StockSnapshot>;
  getStaffStock(principal: Principal, variantId: string): Promise<StockRow>;
  listStock(principal: Principal): Promise<StockRow[]>;
  listMovements(variantId: string): Promise<Movement[]>;
  listStaffMovements(principal: Principal, variantId: string): Promise<StaffMovement[]>;
  listRecentMovements(principal: Principal, limit?: number): Promise<StaffMovement[]>;
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
  hasActiveForOrder(orderId: string): Promise<boolean>;
  confirmForOrder(orderId: string): Promise<void>;
  expireDue(): Promise<number>;
  listDueActive(): Promise<Reservation[]>;
  listInStockVariantIds(): Promise<string[]>;
  listAvailabilityByVariantIds(
    variantIds: readonly string[],
  ): Promise<Array<{ variantId: string; available: number }>>;
  listAnomalies(principal: Principal): Promise<InventoryAnomaly[]>;
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
        actorUserId: actorUserId(principal),
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

    async getStaffStock(principal, variantId) {
      requireInventoryRole(principal);
      const item = await requireItem(deps.inventory, variantId);
      return toStockRow(item);
    },

    async listStock(principal) {
      requireInventoryRole(principal);
      const items = await deps.inventory.listItems();
      return items.map(toStockRow);
    },

    async listMovements(variantId) {
      const item = await requireItem(deps.inventory, variantId);
      return deps.inventory.listMovements(item.id);
    },

    async listStaffMovements(principal, variantId) {
      requireInventoryRole(principal);
      const item = await requireItem(deps.inventory, variantId);
      const rows = await deps.inventory.listMovements(item.id);
      return rows.map((row) => ({ ...row, variantId: item.variantId }));
    },

    async listRecentMovements(principal, limit = DEFAULT_RECENT_MOVEMENTS) {
      requireInventoryRole(principal);
      const take =
        Number.isInteger(limit) && limit > 0 ? limit : DEFAULT_RECENT_MOVEMENTS;
      const [items, rows] = await Promise.all([
        deps.inventory.listItems(),
        deps.inventory.listRecentMovements(take),
      ]);
      const variantByItem = new Map(items.map((item) => [item.id, item.variantId]));
      return rows.map((row) => ({
        ...row,
        variantId: variantByItem.get(row.inventoryItemId) ?? row.inventoryItemId,
      }));
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
      const holdMs = input.holdMs ?? DEFAULT_HOLD_MS;
      try {
        return await deps.inventory.insertActive({
          inventoryItemId: item.id,
          quantity: input.quantity,
          expiresAt: new Date(deps.clock.now().getTime() + holdMs),
          ...(input.cartId !== undefined ? { cartId: input.cartId } : {}),
          ...(input.orderId !== undefined ? { orderId: input.orderId } : {}),
        });
      } catch (error) {
        mapInventoryWriteError(error);
      }
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
        try {
          released.push(await transition(deps, hold.id, "release"));
        } catch (error) {
          if (error instanceof ConflictError) {
            continue;
          }
          throw error;
        }
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

    async hasActiveForOrder(orderId) {
      const holds = await deps.inventory.listActiveByOrder(orderId);
      return holds.length > 0;
    },

    async confirmForOrder(orderId) {
      const holds = await deps.inventory.listActiveByOrder(orderId);
      const expiresAt = new Date(deps.clock.now().getTime() + CONFIRMED_HOLD_MS);
      for (const hold of holds) {
        await deps.inventory.saveReservation({ ...hold, expiresAt });
      }
    },

    async listDueActive() {
      return deps.inventory.listDueActive(deps.clock.now());
    },

    async listAnomalies(principal) {
      requireInventoryRole(principal);
      const items = await deps.inventory.listItems();
      const dueActive = await deps.inventory.listDueActive(deps.clock.now());
      return detectInventoryAnomalies({
        now: deps.clock.now(),
        items,
        dueActive,
        variantIdByItemId: new Map(items.map((item) => [item.id, item.variantId])),
      });
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

function toStockRow(item: {
  variantId: string;
  onHand: number;
  reserved: number;
}): StockRow {
  return {
    variantId: item.variantId,
    onHand: item.onHand,
    reserved: item.reserved,
    available: item.onHand - item.reserved,
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
