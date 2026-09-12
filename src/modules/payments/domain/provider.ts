/**
 * Provider reference is the only identifier other modules may store.
 * Concrete provider names stay inside `payments`.
 */
export type PaymentProviderName = string;

export interface PaymentProviderRef {
  readonly name: PaymentProviderName;
}

/**
 * Caller-supplied key so a retried create or refund does not charge twice.
 * Stable for one attempt; a later retry after FAILED/CANCELLED uses a new key.
 */
export type PaymentIdempotencyKey = string;

export function paymentAttemptIdempotencyKey(
  orderId: string,
  attempt: number,
): PaymentIdempotencyKey {
  return `pay:${orderId}:${attempt}`;
}

export function refundIdempotencyKey(
  paymentId: string,
  amountMinor: number,
): PaymentIdempotencyKey {
  return `refund:${paymentId}:${amountMinor}`;
}
