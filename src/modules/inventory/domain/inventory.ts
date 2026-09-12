export type ReservationStatus = "ACTIVE" | "COMMITTED" | "RELEASED" | "EXPIRED";

export const MOVEMENT_TYPES = [
  "RECEIPT",
  "ADJUSTMENT",
  "RETURN",
  "RESERVE",
  "RELEASE",
  "EXPIRE",
  "COMMIT",
] as const;

export type MovementType = (typeof MOVEMENT_TYPES)[number];

export const EXTERNAL_MOVEMENT_TYPES = ["RECEIPT", "ADJUSTMENT", "RETURN"] as const;

export type ExternalMovementType = (typeof EXTERNAL_MOVEMENT_TYPES)[number];

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
  cartId?: string;
  orderId?: string;
}

export interface Movement {
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
}

export function assertPositiveQuantity(quantity: number): void {
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new Error("quantity_invalid");
  }
}

export function sanitizeMovementNote(note: string | undefined): string | null {
  const cleaned = note?.normalize("NFKC").trim() ?? "";
  if (cleaned.length === 0) {
    return null;
  }
  return cleaned.slice(0, 240);
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

export function applyReceipt(item: InventoryItem, quantity: number): InventoryItem {
  assertPositiveQuantity(quantity);
  return { ...item, onHand: item.onHand + quantity };
}

export function applyReturn(item: InventoryItem, quantity: number): InventoryItem {
  return applyReceipt(item, quantity);
}

export function applyAdjustment(item: InventoryItem, quantity: number): InventoryItem {
  assertPositiveQuantity(quantity);
  if (item.onHand - quantity < item.reserved) {
    throw new Error("adjustment_below_reserved");
  }
  return { ...item, onHand: item.onHand - quantity };
}

export function applyExternalMovement(
  item: InventoryItem,
  type: ExternalMovementType,
  quantity: number,
): InventoryItem {
  if (type === "ADJUSTMENT") {
    return applyAdjustment(item, quantity);
  }
  return applyReceipt(item, quantity);
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
