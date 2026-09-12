import type { PaymentRepository } from "../application/ports";
import type { PaymentAttempt, ProviderEvent } from "../domain/payment";

export function createMemoryPaymentRepository(): PaymentRepository {
  const payments = new Map<string, PaymentAttempt>();
  const events = new Map<string, ProviderEvent>();
  return {
    async listByOrder(orderId) {
      return [...payments.values()].filter((row) => row.orderId === orderId);
    },
    async save(payment) {
      payments.set(payment.id, payment);
      return payment;
    },
    async findById(id) {
      return payments.get(id) ?? null;
    },
    async findByProviderPaymentId(provider, providerPaymentId) {
      return (
        [...payments.values()].find(
          (row) => row.provider === provider && row.providerPaymentId === providerPaymentId,
        ) ?? null
      );
    },
    async findEvent(provider, providerEventId) {
      return events.get(`${provider}:${providerEventId}`) ?? null;
    },
    async saveEvent(event) {
      events.set(`${event.provider}:${event.providerEventId}`, event);
      return event;
    },
  };
}
