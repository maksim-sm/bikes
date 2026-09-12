import { describe, expect, it } from "vitest";
import { ConflictError } from "@/lib/errors";
import {
  applyProviderEvent,
  canStartPayment,
  type Payment,
  type PaymentEvent,
} from "../domain/payment";
import { MockPaymentProvider } from "../infrastructure/mock-provider";
import type { PaymentOrder, PaymentRepository } from "./ports";
import { createPaymentServices } from "./services";

function memoryPayments(): PaymentRepository {
  const payments = new Map<string, Payment>();
  const events = new Map<string, PaymentEvent>();
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
    async findEvent(provider, providerEventId) {
      return events.get(`${provider}:${providerEventId}`) ?? null;
    },
    async saveEvent(event) {
      events.set(`${event.provider}:${event.providerEventId}`, event);
      return event;
    },
  };
}

describe("payment rules", () => {
  it("allows only one pending attempt per order", () => {
    const pending: Payment = {
      id: "p1",
      orderId: "o1",
      provider: "mock",
      providerPaymentId: "p1",
      amountMinor: 100,
      currency: "BYN",
      status: "PENDING",
    };
    expect(canStartPayment([pending])).toBe(false);
    expect(applyProviderEvent(pending, "succeeded")).toBe("SUCCEEDED");
  });
});

describe("payment services", () => {
  it("starts a mock payment and applies an idempotent webhook", async () => {
    const orders: PaymentOrder = {
      async amountDueMinor() {
        return { amountMinor: 4500, currency: "BYN" };
      },
      async applyEvent() {},
    };
    const payments = createPaymentServices({
      payments: memoryPayments(),
      provider: new MockPaymentProvider(),
      orders,
    });
    const started = await payments.startPayment("o1", "https://store.local/return");
    const body = JSON.stringify({
      paymentId: started.paymentId,
      eventId: "evt-1",
      type: "succeeded",
    });
    const first = await payments.handleWebhook(body, { "x-mock-signature": "ok" });
    const replay = await payments.handleWebhook(body, { "x-mock-signature": "ok" });
    expect(first.status).toBe("SUCCEEDED");
    expect(replay.status).toBe("SUCCEEDED");
    await expect(
      payments.startPayment("o1", "https://store.local/return"),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
