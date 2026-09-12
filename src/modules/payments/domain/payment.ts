import type { PaymentIdempotencyKey, PaymentProviderName } from "./provider";
import type { NormalizedPaymentStatus } from "./status";

export type PaymentStatus =
  | "CREATED"
  | "PENDING"
  | "AUTHORIZED"
  | "SUCCEEDED"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED"
  | "REFUND_PENDING"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

/** Statuses that still block a second attempt on the same order. */
const OPEN_ATTEMPT_STATUSES: ReadonlySet<PaymentStatus> = new Set([
  "CREATED",
  "PENDING",
  "AUTHORIZED",
  "SUCCEEDED",
  "REFUND_PENDING",
  "PARTIALLY_REFUNDED",
]);

/**
 * Allowed next statuses, including a self-transition so webhook replays
 * and polls are idempotent. Browser return URLs are not a source here.
 */
export const PAYMENT_TRANSITIONS: Record<PaymentStatus, readonly PaymentStatus[]> = {
  CREATED: [
    "CREATED",
    "PENDING",
    "AUTHORIZED",
    "SUCCEEDED",
    "FAILED",
    "EXPIRED",
    "CANCELLED",
  ],
  PENDING: ["PENDING", "AUTHORIZED", "SUCCEEDED", "FAILED", "EXPIRED", "CANCELLED"],
  AUTHORIZED: ["AUTHORIZED", "SUCCEEDED", "FAILED", "EXPIRED", "CANCELLED"],
  SUCCEEDED: ["SUCCEEDED", "REFUND_PENDING", "REFUNDED", "PARTIALLY_REFUNDED"],
  FAILED: ["FAILED"],
  EXPIRED: ["EXPIRED"],
  CANCELLED: ["CANCELLED"],
  REFUND_PENDING: ["REFUND_PENDING", "REFUNDED", "PARTIALLY_REFUNDED", "SUCCEEDED"],
  REFUNDED: ["REFUNDED"],
  PARTIALLY_REFUNDED: ["PARTIALLY_REFUNDED", "REFUND_PENDING", "REFUNDED"],
};

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

export function canTransition(from: PaymentStatus, to: PaymentStatus): boolean {
  return PAYMENT_TRANSITIONS[from].includes(to);
}

export function canStartPayment(existing: readonly PaymentAttempt[]): boolean {
  return !existing.some((payment) => OPEN_ATTEMPT_STATUSES.has(payment.status));
}

export function canCancelPayment(payment: PaymentAttempt): boolean {
  return (
    payment.status === "CREATED" ||
    payment.status === "PENDING" ||
    payment.status === "AUTHORIZED"
  );
}

export function applyProviderEvent(
  payment: PaymentAttempt,
  status: NormalizedPaymentStatus,
): PaymentStatus {
  if (!canTransition(payment.status, status)) {
    throw new Error("illegal_payment_transition");
  }
  return status;
}

export function refundStatus(
  payment: PaymentAttempt,
  refundMinor: number,
): PaymentStatus {
  if (payment.status !== "SUCCEEDED" && payment.status !== "PARTIALLY_REFUNDED") {
    throw new Error("payment_not_refundable");
  }
  if (refundMinor <= 0 || refundMinor > payment.amountMinor) {
    throw new Error("refund_out_of_range");
  }
  return refundMinor === payment.amountMinor ? "REFUNDED" : "PARTIALLY_REFUNDED";
}
