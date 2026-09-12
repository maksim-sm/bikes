import type { PaymentIdempotencyKey, PaymentProviderName } from "./provider";
import type { NormalizedPaymentStatus } from "./status";

export type PaymentStatus =
  | "PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

/** One try to collect money for an order through a named provider. */
export interface PaymentAttempt {
  id: string;
  orderId: string;
  provider: PaymentProviderName;
  providerPaymentId: string | null;
  amountMinor: number;
  currency: "BYN";
  status: PaymentStatus;
  idempotencyKey: PaymentIdempotencyKey | null;
}

/** Persisted name of a payment attempt (Prisma `Payment`). */
export type Payment = PaymentAttempt;

/** A verified notification from a provider, stored for webhook idempotency. */
export interface ProviderEvent {
  id: string;
  paymentId: string;
  provider: PaymentProviderName;
  providerEventId: string;
  providerPaymentId: string;
  rawType: string;
  status: NormalizedPaymentStatus;
}

/** Persisted name of a provider event (Prisma `PaymentEvent`). */
export type PaymentEvent = ProviderEvent;

export function canStartPayment(existing: readonly PaymentAttempt[]): boolean {
  return !existing.some(
    (payment) => payment.status === "PENDING" || payment.status === "SUCCEEDED",
  );
}

export function applyProviderEvent(
  payment: PaymentAttempt,
  status: NormalizedPaymentStatus,
): PaymentStatus {
  if (payment.status === status) {
    return payment.status;
  }
  if (status === "PENDING") {
    return payment.status;
  }
  if (status === "REFUNDED" || status === "PARTIALLY_REFUNDED") {
    if (payment.status !== "SUCCEEDED" && payment.status !== "PARTIALLY_REFUNDED") {
      throw new Error("payment_not_refundable");
    }
    if (payment.status === "REFUNDED") {
      return "REFUNDED";
    }
    return status;
  }
  if (payment.status !== "PENDING") {
    throw new Error("payment_not_pending");
  }
  return status;
}

export function refundStatus(payment: PaymentAttempt, refundMinor: number): PaymentStatus {
  if (payment.status !== "SUCCEEDED" && payment.status !== "PARTIALLY_REFUNDED") {
    throw new Error("payment_not_refundable");
  }
  if (refundMinor <= 0 || refundMinor > payment.amountMinor) {
    throw new Error("refund_out_of_range");
  }
  return refundMinor === payment.amountMinor ? "REFUNDED" : "PARTIALLY_REFUNDED";
}
