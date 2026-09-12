/**
 * delivery module — public entry point.
 *
 * Owns methods, zones, quotes, and the shipment assignment. Manual-first:
 * staff record tracking after a human arranges the parcel.
 */

export {
  matchZone,
  nextShipmentStatus,
  quoteMethod,
  type DeliveryMethodRecord,
  type DeliveryQuote,
  type DeliveryZone,
  type Destination,
  type ShipmentStatus,
} from "./domain/quote";
export type {
  DeliveryRepository,
  ShipmentRecord,
  ShipmentRepository,
} from "./application/ports";
export { createDeliveryServices, type DeliveryServices } from "./application/services";
export {
  createDemoDeliveryRepository,
  createMemoryShipments,
} from "./infrastructure/demo-delivery";
