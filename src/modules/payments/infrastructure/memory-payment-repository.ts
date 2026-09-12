import type { PaymentRepository } from "../application/ports";
import {
  isPaymentTimedOut,
  type PaymentAttempt,
  type ProviderEvent,
} from "../domain/payment";

export function createMemoryPaymentRepository(
  seed: readonly PaymentAttempt[] = [],
): PaymentRepository {
  const payments = new Map<string, PaymentAttempt>(
    seed.map((payment) => [payment.id, payment]),
  );
  const events = new Map<string, ProviderEvent>();
  return {
    async listByOrder(orderId) {
      return [...payments.values()].filter((row) => row.orderId === orderId);
    },
    async listExpiredOpen(now) {
      return [...payments.values()].filter((row) => isPaymentTimedOut(row, now));
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
          (row) =>
            row.provider === provider && row.providerPaymentId === providerPaymentId,
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
