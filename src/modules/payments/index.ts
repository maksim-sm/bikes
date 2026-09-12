/**
 * payments module — public entry point.
 *
 * Owns payment attempts, webhook events, and refunds. Does not write order
 * rows; it reports events through a port `orders` implements.
 */

export {
  applyProviderEvent,
  canStartPayment,
  refundStatus,
  type Payment,
  type PaymentEvent,
  type PaymentStatus,
} from "./domain/payment";
export type {
  PaymentOrder,
  PaymentProvider,
  PaymentRepository,
} from "./application/ports";
export { createPaymentServices, type PaymentServices } from "./application/services";
export { MockPaymentProvider } from "./infrastructure/mock-provider";
