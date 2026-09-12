import type { Payment, PaymentEvent } from "../domain/payment";

export interface PaymentProvider {
  readonly name: string;
  createPayment(input: {
    orderId: string;
    amountMinor: number;
    currency: "BYN";
    returnUrl: string;
  }): Promise<{ paymentId: string; redirectUrl: string }>;
  verifyWebhook(
    rawBody: string,
    headers: Readonly<Record<string, string>>,
  ): Promise<{ providerEventId: string; type: "succeeded" | "failed" | "cancelled" }>;
}

export interface PaymentRepository {
  listByOrder(orderId: string): Promise<Payment[]>;
  save(payment: Payment): Promise<Payment>;
  findById(id: string): Promise<Payment | null>;
  findEvent(provider: string, providerEventId: string): Promise<PaymentEvent | null>;
  saveEvent(event: PaymentEvent): Promise<PaymentEvent>;
}

export interface PaymentOrder {
  amountDueMinor(orderId: string): Promise<{ amountMinor: number; currency: "BYN" }>;
  applyEvent(
    orderId: string,
    event: { type: "succeeded" | "failed" | "cancelled" },
  ): Promise<void>;
}
