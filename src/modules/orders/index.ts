/**
 * orders module — public entry point.
 *
 * Owns the commercial agreement, line snapshots, and the payment/fulfillment
 * projections. Checkout is a server-controlled use case on this module:
 * the browser may send cart identity, a delivery method, and customer data —
 * never prices or the order total.
 */

export {
  formatOrderNumber,
  projectFulfillmentStatus,
  projectPaymentStatus,
  transitionOrder,
  type FulfillmentStatus,
  type Order,
  type OrderLine,
  type OrderShipping,
  type OrderStatus,
  type PaymentStatus,
} from "./domain/order";
export {
  CHECKOUT_PAYMENT_CODES,
  assertCheckoutCustomer,
  assertCheckoutDestination,
  assertCheckoutPayment,
  checkoutTotals,
  isCheckoutPaymentCode,
  type CheckoutCustomer,
  type CheckoutDestination,
  type CheckoutPaymentCode,
} from "./domain/checkout";
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
export {
  orderCartAdapter,
  orderCatalogAdapter,
  orderDeliveryAdapter,
  orderInventoryAdapter,
} from "./application/adapters";
export { createMemoryOrderRepository } from "./infrastructure/memory-order-repository";
export { createPrismaOrderRepository } from "./application/create-order";
