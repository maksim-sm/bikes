/**
 * orders module — public entry point.
 *
 * Owns the commercial agreement, line snapshots, and the payment/fulfillment
 * projections. Does not take payment or ship parcels.
 */

export {
  formatOrderNumber,
  projectFulfillmentStatus,
  projectPaymentStatus,
  transitionOrder,
  type FulfillmentStatus,
  type Order,
  type OrderLine,
  type OrderStatus,
  type PaymentStatus,
} from "./domain/order";
export type {
  Clock,
  OrderCart,
  OrderCatalog,
  OrderDelivery,
  OrderInventory,
  OrderRepository,
  PlaceOrderInput,
} from "./application/ports";
export { createOrderServices, type OrderServices } from "./application/services";
