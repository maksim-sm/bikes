/**
 * inventory module — public entry point.
 *
 * Owns on-hand, reserved, and available counters and reservation lifecycle.
 * Application code inserts reservation rows and RECEIPT/ADJUSTMENT/RETURN
 * movements. PostgreSQL triggers (or the same domain functions in tests)
 * keep counters and the ledger aligned.
 */

export {
  detectInventoryAnomalies,
  type InventoryAnomaly,
  type InventoryAnomalyCode,
} from "./domain/anomalies";
export {
  applyAdjustment,
  applyCommit,
  applyReceipt,
  applyRelease,
  applyReserve,
  applyReturn,
  available,
  canReserve,
  isExpired,
  nextReservationStatus,
  type ExternalMovementType,
  type InventoryItem,
  type Movement,
  type MovementType,
  type Reservation,
  type ReservationStatus,
} from "./domain/inventory";
export type { Clock, InventoryRepository } from "./application/ports";
export {
  createInventoryServices,
  type InventoryServices,
  type StaffMovement,
  type StockRow,
  type StockSnapshot,
} from "./application/services";
export { createMemoryInventoryRepository } from "./infrastructure/memory-inventory";
export {
  createPrismaCatalogInventory,
  createPrismaInventoryRepository,
  createPrismaInventoryServices,
} from "./application/create-inventory";
