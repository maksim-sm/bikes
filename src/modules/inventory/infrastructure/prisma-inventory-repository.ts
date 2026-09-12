import { prisma, type PrismaClient } from "@/lib/db";
import { mapInventoryWriteError } from "../application/inventory-errors";
import type { InventoryRepository } from "../application/ports";
import type {
  ExternalMovementType,
  InventoryItem,
  Movement,
  MovementType,
  Reservation,
  ReservationStatus,
} from "../domain/inventory";

function toItem(row: {
  id: string;
  variantId: string;
  onHand: number;
  reserved: number;
}): InventoryItem {
  return {
    id: row.id,
    variantId: row.variantId,
    onHand: row.onHand,
    reserved: row.reserved,
  };
}

function toReservation(row: {
  id: string;
  inventoryItemId: string;
  quantity: number;
  status: ReservationStatus;
  expiresAt: Date;
  cartId: string | null;
  orderId: string | null;
}): Reservation {
  return {
    id: row.id,
    inventoryItemId: row.inventoryItemId,
    quantity: row.quantity,
    status: row.status,
    expiresAt: row.expiresAt,
    ...(row.cartId ? { cartId: row.cartId } : {}),
    ...(row.orderId ? { orderId: row.orderId } : {}),
  };
}

function toMovement(row: {
  id: string;
  inventoryItemId: string;
  reservationId: string | null;
  type: MovementType;
  quantity: number;
  onHandAfter: number;
  reservedAfter: number;
  note: string | null;
  actorUserId: string | null;
  createdAt: Date;
}): Movement {
  return {
    id: row.id,
    inventoryItemId: row.inventoryItemId,
    reservationId: row.reservationId,
    type: row.type,
    quantity: row.quantity,
    onHandAfter: row.onHandAfter,
    reservedAfter: row.reservedAfter,
    note: row.note,
    actorUserId: row.actorUserId,
    createdAt: row.createdAt,
  };
}

/**
 * Inventory-owned queries and writes. Catalog listing asks for in-stock
 * variant ids instead of joining `inventory_items` from the catalog repository.
 * Reservation and movement inserts rely on PostgreSQL triggers for counters.
 */
export function createPrismaInventoryRepository(
  client: PrismaClient = prisma,
): InventoryRepository {
  return {
    async getByVariantId(variantId) {
      const row = await client.inventoryItem.findUnique({ where: { variantId } });
      return row ? toItem(row) : null;
    },
    async getByItemId(id) {
      const row = await client.inventoryItem.findUnique({ where: { id } });
      return row ? toItem(row) : null;
    },
    async insertActive(input) {
      try {
        const row = await client.inventoryReservation.create({
          data: {
            inventoryItemId: input.inventoryItemId,
            quantity: input.quantity,
            expiresAt: input.expiresAt,
            status: "ACTIVE",
            ...(input.cartId !== undefined ? { cartId: input.cartId } : {}),
            ...(input.orderId !== undefined ? { orderId: input.orderId } : {}),
          },
        });
        return toReservation(row);
      } catch (error) {
        mapInventoryWriteError(error);
      }
    },
    async getReservation(id) {
      const row = await client.inventoryReservation.findUnique({ where: { id } });
      return row ? toReservation(row) : null;
    },
    async saveReservation(reservation) {
      try {
        const row = await client.inventoryReservation.update({
          where: { id: reservation.id },
          data: { status: reservation.status, expiresAt: reservation.expiresAt },
        });
        return toReservation(row);
      } catch (error) {
        mapInventoryWriteError(error);
      }
    },
    async listDueActive(now) {
      const rows = await client.inventoryReservation.findMany({
        where: { status: "ACTIVE", expiresAt: { lte: now } },
      });
      return rows.map(toReservation);
    },
    async listActiveByOrder(orderId) {
      const rows = await client.inventoryReservation.findMany({
        where: { status: "ACTIVE", orderId },
      });
      return rows.map(toReservation);
    },
    async insertExternalMovement(input) {
      const row = await client.inventoryMovement.create({
        data: {
          inventoryItemId: input.inventoryItemId,
          type: input.type as ExternalMovementType,
          quantity: input.quantity,
          onHandAfter: 0,
          reservedAfter: 0,
          note: input.note,
          actorUserId: input.actorUserId,
        },
      });
      return toMovement(row);
    },
    async listItems() {
      const rows = await client.inventoryItem.findMany({
        orderBy: { variantId: "asc" },
      });
      return rows.map(toItem);
    },
    async listMovements(inventoryItemId) {
      const rows = await client.inventoryMovement.findMany({
        where: { inventoryItemId },
        orderBy: { createdAt: "asc" },
      });
      return rows.map(toMovement);
    },
    async listRecentMovements(limit) {
      const rows = await client.inventoryMovement.findMany({
        orderBy: { createdAt: "desc" },
        take: limit,
      });
      return rows.map(toMovement);
    },
    async listInStockVariantIds() {
      const rows = await client.inventoryItem.findMany({
        where: { available: { gt: 0 } },
        select: { variantId: true },
      });
      return rows.map((row) => row.variantId);
    },
    async listAvailabilityByVariantIds(variantIds) {
      if (variantIds.length === 0) {
        return [];
      }
      const rows = await client.inventoryItem.findMany({
        where: { variantId: { in: [...variantIds] } },
        select: { variantId: true, available: true },
      });
      return rows.map((row) => ({ variantId: row.variantId, available: row.available }));
    },
    async expireDue(now) {
      const rows = await client.$queryRaw<Array<{ expired: bigint | number }>>`
        SELECT expire_inventory_reservations(${now}) AS expired
      `;
      return Number(rows[0]?.expired ?? 0);
    },
  };
}

export function createPrismaInventoryAvailability(): Pick<
  InventoryRepository,
  "listInStockVariantIds" | "listAvailabilityByVariantIds"
> {
  const repo = createPrismaInventoryRepository();
  return {
    listInStockVariantIds: () => repo.listInStockVariantIds(),
    listAvailabilityByVariantIds: (variantIds) =>
      repo.listAvailabilityByVariantIds(variantIds),
  };
}
