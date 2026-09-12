import type { InventoryItem, Reservation } from "../domain/inventory";

export interface Clock {
  now(): Date;
}

export interface InventoryRepository {
  getByVariantId(variantId: string): Promise<InventoryItem | null>;
  getByItemId(id: string): Promise<InventoryItem | null>;
  saveItem(item: InventoryItem): Promise<InventoryItem>;
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
  listInStockVariantIds(): Promise<string[]>;
  listAvailabilityByVariantIds(
    variantIds: readonly string[],
  ): Promise<Array<{ variantId: string; available: number }>>;
}
