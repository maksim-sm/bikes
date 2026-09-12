/**
 * payments module — public entry point.
 *
 * Owns payment attempts, webhook events, and refunds. Does not write order
 * rows; it reports events through a port `orders` implements.
 * Provider adapters are replaceable via `PaymentProvider`.
 */

export {
  applyProviderEvent,
  canStartPayment,
  refundStatus,
  type Payment,
  type PaymentAttempt,
  type PaymentEvent,
  type PaymentStatus,
  type ProviderEvent,
} from "./domain/payment";
export {
  paymentAttemptIdempotencyKey,
  refundIdempotencyKey,
  type PaymentIdempotencyKey,
  type PaymentProviderName,
  type PaymentProviderRef,
} from "./domain/provider";
export {
  normalizePaymentStatus,
  paymentStatusToOrderEvent,
  type NormalizedPaymentStatus,
} from "./domain/status";
export type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentOrder,
  PaymentProvider,
  PaymentRepository,
  ProviderPaymentRef,
  RefundPaymentInput,
  VerifiedProviderEvent,
} from "./application/ports";
export { createPaymentServices, type PaymentServices } from "./application/services";
export { createMemoryPaymentRepository } from "./infrastructure/memory-payment-repository";
export { MockPaymentProvider } from "./infrastructure/mock-provider";
