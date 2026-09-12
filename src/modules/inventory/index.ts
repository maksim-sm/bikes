/**
 * inventory module — public entry point.
 *
 * Owns on-hand, reserved, and available counters and reservation lifecycle.
 * Counter arithmetic is defined in domain for tests; production writes go
 * through reservation rows so PostgreSQL triggers remain the race boundary.
 */

export {
  applyCommit,
  applyReceipt,
  applyRelease,
  applyReserve,
  available,
  canReserve,
  isExpired,
  nextReservationStatus,
  type InventoryItem,
  type Reservation,
  type ReservationStatus,
} from "./domain/inventory";
export type { Clock, InventoryRepository } from "./application/ports";
export { createInventoryServices, type InventoryServices } from "./application/services";
export { createPrismaCatalogInventory } from "./application/create-inventory";
