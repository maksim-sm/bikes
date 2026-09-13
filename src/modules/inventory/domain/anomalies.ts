import { isExpired, type InventoryItem, type Reservation } from "./inventory";

export type InventoryAnomalyCode =
  | "reserved_exceeds_on_hand"
  | "negative_on_hand"
  | "negative_reserved"
  | "stale_active_reservation";

export interface InventoryAnomaly {
  code: InventoryAnomalyCode;
  variantId?: string;
  reservationId?: string;
  onHand?: number;
  reserved?: number;
}

export function detectInventoryAnomalies(input: {
  now: Date;
  items: readonly InventoryItem[];
  dueActive: readonly Reservation[];
  variantIdByItemId: ReadonlyMap<string, string>;
}): InventoryAnomaly[] {
  const found: InventoryAnomaly[] = [];
  for (const item of input.items) {
    if (item.onHand < 0) {
      found.push({
        code: "negative_on_hand",
        variantId: item.variantId,
        onHand: item.onHand,
        reserved: item.reserved,
      });
    }
    if (item.reserved < 0) {
      found.push({
        code: "negative_reserved",
        variantId: item.variantId,
        onHand: item.onHand,
        reserved: item.reserved,
      });
    }
    if (item.onHand >= 0 && item.reserved >= 0 && item.reserved > item.onHand) {
      found.push({
        code: "reserved_exceeds_on_hand",
        variantId: item.variantId,
        onHand: item.onHand,
        reserved: item.reserved,
      });
    }
  }
  for (const reservation of input.dueActive) {
    if (isExpired(reservation, input.now)) {
      const variantId = input.variantIdByItemId.get(reservation.inventoryItemId);
      found.push({
        code: "stale_active_reservation",
        reservationId: reservation.id,
        ...(variantId !== undefined ? { variantId } : {}),
      });
    }
  }
  return found;
}
