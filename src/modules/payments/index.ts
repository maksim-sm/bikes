/**
 * payments module — public entry point.
 *
 * Owns payment attempts, webhook events, and refunds. Does not write order
 * rows; it reports events through a port `orders` implements.
 * Provider adapters are replaceable via `PaymentProvider`.
 */

export {
  applyProviderEvent,
  canCancelPayment,
  canStartPayment,
  canTransition,
  isOpenUnpaidPayment,
  isPaymentTimedOut,
  paymentReleasesReservation,
  PAYMENT_TIMEOUT_MS,
  refundStatus,
  PAYMENT_TRANSITIONS,
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
  type PaymentOrderEventType,
} from "./domain/status";
export type {
  CreatePaymentInput,
  CreatePaymentResult,
  Clock,
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
