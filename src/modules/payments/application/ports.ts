import type { PaymentAttempt, ProviderEvent } from "../domain/payment";
import type { PaymentIdempotencyKey, PaymentProviderRef } from "../domain/provider";
import type { NormalizedPaymentStatus } from "../domain/status";

export interface CreatePaymentInput {
  orderId: string;
  amountMinor: number;
  currency: "BYN";
  returnUrl: string;
  idempotencyKey: PaymentIdempotencyKey;
}

export interface CreatePaymentResult {
  paymentId: string;
  redirectUrl: string;
}

export interface ProviderPaymentRef {
  providerPaymentId: string;
}

export interface RefundPaymentInput {
  providerPaymentId: string;
  amountMinor: number;
  idempotencyKey: PaymentIdempotencyKey;
}

/**
 * Payload every provider must produce after verifying a webhook signature.
 * `payments` must not parse provider JSON itself to find the attempt.
 */
export interface VerifiedProviderEvent {
  providerEventId: string;
  providerPaymentId: string;
  rawType: string;
  status: NormalizedPaymentStatus;
}

/**
 * Replaceable payment adapter. A second implementation can be swapped at
 * compose time; nothing outside `payments` names a concrete provider.
 */
export interface PaymentProvider extends PaymentProviderRef {
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  getPaymentStatus(input: ProviderPaymentRef): Promise<NormalizedPaymentStatus>;
  cancelPayment(input: ProviderPaymentRef): Promise<NormalizedPaymentStatus>;
  refundPayment(input: RefundPaymentInput): Promise<NormalizedPaymentStatus>;
  verifyWebhook(
    rawBody: string,
    headers: Readonly<Record<string, string>>,
  ): Promise<VerifiedProviderEvent>;
  normalizeStatus(rawStatus: string): NormalizedPaymentStatus;
}

export interface PaymentRepository {
  listByOrder(orderId: string): Promise<PaymentAttempt[]>;
  save(payment: PaymentAttempt): Promise<PaymentAttempt>;
  findById(id: string): Promise<PaymentAttempt | null>;
  findByProviderPaymentId(
    provider: string,
    providerPaymentId: string,
  ): Promise<PaymentAttempt | null>;
  findEvent(provider: string, providerEventId: string): Promise<ProviderEvent | null>;
  saveEvent(event: ProviderEvent): Promise<ProviderEvent>;
}

export interface PaymentOrder {
  amountDueMinor(orderId: string): Promise<{ amountMinor: number; currency: "BYN" }>;
  applyEvent(
    orderId: string,
    event: {
      type: "succeeded" | "failed" | "cancelled" | "refunded" | "partially_refunded";
    },
  ): Promise<void>;
}
