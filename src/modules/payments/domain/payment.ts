export type PaymentStatus =
  | "PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export interface Payment {
  id: string;
  orderId: string;
  provider: string;
  providerPaymentId: string | null;
  amountMinor: number;
  currency: "BYN";
  status: PaymentStatus;
}

export interface PaymentEvent {
  id: string;
  paymentId: string;
  provider: string;
  providerEventId: string;
  type: string;
}

export function canStartPayment(existing: readonly Payment[]): boolean {
  return !existing.some(
    (payment) => payment.status === "PENDING" || payment.status === "SUCCEEDED",
  );
}

export function applyProviderEvent(
  payment: Payment,
  eventType: "succeeded" | "failed" | "cancelled",
): PaymentStatus {
  if (payment.status !== "PENDING") {
    throw new Error("payment_not_pending");
  }
  if (eventType === "succeeded") {
    return "SUCCEEDED";
  }
  if (eventType === "failed") {
    return "FAILED";
  }
  return "CANCELLED";
}

export function refundStatus(payment: Payment, refundMinor: number): PaymentStatus {
  if (payment.status !== "SUCCEEDED" && payment.status !== "PARTIALLY_REFUNDED") {
    throw new Error("payment_not_refundable");
  }
  if (refundMinor <= 0 || refundMinor > payment.amountMinor) {
    throw new Error("refund_out_of_range");
  }
  return refundMinor === payment.amountMinor ? "REFUNDED" : "PARTIALLY_REFUNDED";
}
