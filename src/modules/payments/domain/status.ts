import type { PaymentStatus } from "./payment";

/** Provider-neutral payment state. Same union as the payment-attempt status. */
export type NormalizedPaymentStatus = PaymentStatus;

const ALIASES: Record<string, NormalizedPaymentStatus> = {
  pending: "PENDING",
  processing: "PENDING",
  authorized: "PENDING",
  created: "PENDING",
  succeeded: "SUCCEEDED",
  success: "SUCCEEDED",
  paid: "SUCCEEDED",
  completed: "SUCCEEDED",
  captured: "SUCCEEDED",
  failed: "FAILED",
  declined: "FAILED",
  error: "FAILED",
  cancelled: "CANCELLED",
  canceled: "CANCELLED",
  voided: "CANCELLED",
  refunded: "REFUNDED",
  partially_refunded: "PARTIALLY_REFUNDED",
  partial_refund: "PARTIALLY_REFUNDED",
};

/**
 * Maps a provider-specific status string onto the shared union.
 * Already-normalized values (`PENDING`, `SUCCEEDED`, …) pass through.
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
  return (
    value === "PENDING" ||
    value === "SUCCEEDED" ||
    value === "FAILED" ||
    value === "CANCELLED" ||
    value === "REFUNDED" ||
    value === "PARTIALLY_REFUNDED"
  );
}

export function paymentStatusToOrderEvent(status: NormalizedPaymentStatus): {
  type: "succeeded" | "failed" | "cancelled" | "refunded" | "partially_refunded";
} | null {
  if (status === "SUCCEEDED") {
    return { type: "succeeded" };
  }
  if (status === "FAILED") {
    return { type: "failed" };
  }
  if (status === "CANCELLED") {
    return { type: "cancelled" };
  }
  if (status === "REFUNDED") {
    return { type: "refunded" };
  }
  if (status === "PARTIALLY_REFUNDED") {
    return { type: "partially_refunded" };
  }
  return null;
}
