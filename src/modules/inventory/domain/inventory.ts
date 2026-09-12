export type ReservationStatus = "ACTIVE" | "COMMITTED" | "RELEASED" | "EXPIRED";

export interface InventoryItem {
  id: string;
  variantId: string;
  onHand: number;
  reserved: number;
}

export interface Reservation {
  id: string;
  inventoryItemId: string;
  quantity: number;
  status: ReservationStatus;
  expiresAt: Date;
}

export function available(item: InventoryItem): number {
  return item.onHand - item.reserved;
}

export function canReserve(item: InventoryItem, quantity: number): boolean {
  return Number.isInteger(quantity) && quantity > 0 && available(item) >= quantity;
}

export function isExpired(reservation: Reservation, now: Date): boolean {
  return (
    reservation.status === "ACTIVE" && reservation.expiresAt.getTime() <= now.getTime()
  );
}

export function nextReservationStatus(
  current: ReservationStatus,
  action: "commit" | "release" | "expire",
): ReservationStatus {
  if (current !== "ACTIVE") {
    throw new Error("reservation_not_active");
  }
  if (action === "commit") {
    return "COMMITTED";
  }
  if (action === "release") {
    return "RELEASED";
  }
  return "EXPIRED";
}

export function applyReserve(item: InventoryItem, quantity: number): InventoryItem {
  if (!canReserve(item, quantity)) {
    throw new Error("insufficient_available");
  }
  return { ...item, reserved: item.reserved + quantity };
}

export function applyRelease(item: InventoryItem, quantity: number): InventoryItem {
  if (item.reserved < quantity) {
    throw new Error("reservation_counter_mismatch");
  }
  return { ...item, reserved: item.reserved - quantity };
}

export function applyCommit(item: InventoryItem, quantity: number): InventoryItem {
  if (item.reserved < quantity || item.onHand < quantity) {
    throw new Error("reservation_counter_mismatch");
  }
  return {
    ...item,
    reserved: item.reserved - quantity,
    onHand: item.onHand - quantity,
  };
}
