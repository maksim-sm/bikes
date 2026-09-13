/**
 * delivery module — public entry point.
 *
 * Owns methods, zones, quotes, and the shipment assignment. Manual-first:
 * staff record tracking after a human arranges the parcel.
 */

export {
  applyFixedPrice,
  matchZone,
  nextShipmentStatus,
  quoteMethod,
  type DeliveryKind,
  type DeliveryMethodRecord,
  type DeliveryQuote,
  type DeliveryZone,
  type Destination,
  type PickupPoint,
  type QuoteOptions,
  type ShipmentStatus,
} from "./domain/quote";
export {
  emptyTracking,
  normalizeTracking,
  type ShipmentRecord,
  type ShipmentTracking,
} from "./domain/shipment";
export type { DeliveryRepository, ShipmentRepository } from "./application/ports";
export {
  createDeliveryServices,
  type DeliveryOrderContact,
  type DeliveryServices,
} from "./application/services";
export {
  createDemoDeliveryRepository,
  createMemoryShipments,
} from "./infrastructure/demo-delivery";
export {
  createPrismaDeliveryRepository,
  createPrismaShipmentRepository,
} from "./infrastructure/prisma-delivery-repository";
