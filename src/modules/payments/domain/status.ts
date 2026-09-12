import type { PaymentStatus } from "./payment";

/** Provider-neutral payment state. Same union as the payment-attempt status. */
export type NormalizedPaymentStatus = PaymentStatus;

export type PaymentOrderEventType =
  | "created"
  | "pending"
  | "authorized"
  | "succeeded"
  | "failed"
  | "expired"
  | "cancelled"
  | "refund_pending"
  | "refunded"
  | "partially_refunded";

const ALIASES: Record<string, NormalizedPaymentStatus> = {
  created: "CREATED",
  pending: "PENDING",
  processing: "PENDING",
  authorized: "AUTHORIZED",
  authorizing: "AUTHORIZED",
  held: "AUTHORIZED",
  succeeded: "SUCCEEDED",
  success: "SUCCEEDED",
  paid: "SUCCEEDED",
  completed: "SUCCEEDED",
  captured: "SUCCEEDED",
  failed: "FAILED",
  declined: "FAILED",
  error: "FAILED",
  expired: "EXPIRED",
  timeout: "EXPIRED",
  cancelled: "CANCELLED",
  canceled: "CANCELLED",
  voided: "CANCELLED",
  refund_pending: "REFUND_PENDING",
  refunding: "REFUND_PENDING",
  refunded: "REFUNDED",
  partially_refunded: "PARTIALLY_REFUNDED",
  partial_refund: "PARTIALLY_REFUNDED",
};

const ORDER_EVENT: Record<NormalizedPaymentStatus, PaymentOrderEventType> = {
  CREATED: "created",
  PENDING: "pending",
  AUTHORIZED: "authorized",
  SUCCEEDED: "succeeded",
  FAILED: "failed",
  EXPIRED: "expired",
  CANCELLED: "cancelled",
  REFUND_PENDING: "refund_pending",
  REFUNDED: "refunded",
  PARTIALLY_REFUNDED: "partially_refunded",
};

/**
 * Maps a provider-specific status string onto the shared union.
 * Already-normalized values (`CREATED`, `SUCCEEDED`, …) pass through.
 */
export function normalizePaymentStatus(rawStatus: string): NormalizedPaymentStatus {
  const trimmed = rawStatus.trim();
  const upper = trimmed.toUpperCase().replace(/[\s-]+/g, "_");
  if (isNormalized(upper)) {
    return upper;
  }
  const mapped = ALIASES[trimmed.toLowerCase().replace(/[\s-]+/g, "_")];
  if (!mapped) {
    throw new Error("unknown_provider_status");
  }
  return mapped;
}

function isNormalized(value: string): value is NormalizedPaymentStatus {
  return value in ORDER_EVENT;
}

export function paymentStatusToOrderEvent(status: NormalizedPaymentStatus): {
  type: PaymentOrderEventType;
} {
  return { type: ORDER_EVENT[status] };
}
