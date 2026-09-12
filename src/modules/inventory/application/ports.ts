import type {
  ExternalMovementType,
  InventoryItem,
  Movement,
  Reservation,
} from "../domain/inventory";

export interface Clock {
  now(): Date;
}

export interface InventoryRepository {
  getByVariantId(variantId: string): Promise<InventoryItem | null>;
  getByItemId(id: string): Promise<InventoryItem | null>;
  insertActive(input: {
    inventoryItemId: string;
    quantity: number;
    expiresAt: Date;
    cartId?: string;
    orderId?: string;
  }): Promise<Reservation>;
  getReservation(id: string): Promise<Reservation | null>;
  saveReservation(reservation: Reservation): Promise<Reservation>;
  listDueActive(now: Date): Promise<Reservation[]>;
  listActiveByOrder(orderId: string): Promise<Reservation[]>;
  insertExternalMovement(input: {
    inventoryItemId: string;
    type: ExternalMovementType;
    quantity: number;
    note: string | null;
    actorUserId: string | null;
    now: Date;
  }): Promise<Movement>;
  listItems(): Promise<InventoryItem[]>;
  listMovements(inventoryItemId: string): Promise<Movement[]>;
  listRecentMovements(limit: number): Promise<Movement[]>;
  listInStockVariantIds(): Promise<string[]>;
  listAvailabilityByVariantIds(
    variantIds: readonly string[],
  ): Promise<Array<{ variantId: string; available: number }>>;
  expireDue?(now: Date): Promise<number>;
}
