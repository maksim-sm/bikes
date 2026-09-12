import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { requireInventoryRole, type Principal } from "@/modules/identity";
import {
  applyReceipt,
  available,
  canReserve,
  nextReservationStatus,
  type Reservation,
} from "../domain/inventory";
import type { Clock, InventoryRepository } from "./ports";

const DEFAULT_HOLD_MS = 15 * 60 * 1000;

export interface InventoryServices {
  getAvailability(variantId: string): Promise<{
    onHand: number;
    reserved: number;
    available: number;
  }>;
  reserve(input: {
    variantId: string;
    quantity: number;
    cartId?: string;
    orderId?: string;
    holdMs?: number;
  }): Promise<Reservation>;
  release(reservationId: string): Promise<Reservation>;
  commit(reservationId: string): Promise<Reservation>;
  expireDue(): Promise<number>;
  listInStockVariantIds(): Promise<string[]>;
  receiveStock(
    principal: Principal,
    input: { variantId: string; quantity: number },
  ): Promise<{ onHand: number; reserved: number; available: number }>;
}

/**
 * Application code inserts or transitions reservation rows. Counter changes
 * happen in the repository (PostgreSQL triggers in production, the same
 * domain functions in tests). Do not add `reserved` in this layer.
 */
export function createInventoryServices(deps: {
  inventory: InventoryRepository;
  clock: Clock;
}): InventoryServices {
  return {
    async getAvailability(variantId) {
      const item = await deps.inventory.getByVariantId(variantId);
      if (!item) {
        throw new NotFoundError("inventory item not found", { variantId });
      }
      return {
        onHand: item.onHand,
        reserved: item.reserved,
        available: available(item),
      };
    },

    async reserve(input) {
      if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
        throw new ValidationError("quantity must be a positive integer");
      }
      const item = await deps.inventory.getByVariantId(input.variantId);
      if (!item) {
        throw new NotFoundError("inventory item not found", {
          variantId: input.variantId,
        });
      }
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

    async listInStockVariantIds() {
      return deps.inventory.listInStockVariantIds();
    },

    async receiveStock(principal, input) {
      requireInventoryRole(principal);
      if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
        throw new ValidationError("quantity must be a positive integer");
      }
      const item = await deps.inventory.getByVariantId(input.variantId);
      if (!item) {
        throw new NotFoundError("inventory item not found", {
          variantId: input.variantId,
        });
      }
      const saved = await deps.inventory.saveItem(applyReceipt(item, input.quantity));
      return {
        onHand: saved.onHand,
        reserved: saved.reserved,
        available: available(saved),
      };
    },

    async expireDue() {
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
