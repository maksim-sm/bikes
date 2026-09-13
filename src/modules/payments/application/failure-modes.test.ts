import { describe, expect, it } from "vitest";
import { ConflictError, UnavailableError } from "@/lib/errors";
import { staffPrincipal } from "@/modules/identity";
import { createMemoryPaymentRepository } from "../infrastructure/memory-payment-repository";
import { MockPaymentProvider } from "../infrastructure/mock-provider";
import type { PaymentOrder, PaymentProvider } from "./ports";
import { createPaymentServices } from "./services";

function orders(): PaymentOrder {
  return {
    async amountDueMinor() {
      return { amountMinor: 4500, currency: "BYN" };
    },
    async applyEvent() {},
  };
}

class TimeoutOnCreate extends MockPaymentProvider {
  override async createPayment(): Promise<never> {
    throw new Error("ETIMEDOUT");
  }
}

class TimeoutOnPoll extends MockPaymentProvider {
  override async getPaymentStatus(): Promise<never> {
    throw new Error("payment_provider_timeout");
  }
}

function webhook(paymentId: string, eventId: string, type: string): string {
  return JSON.stringify({ paymentId, eventId, type });
}

describe("payment failure modes", () => {
  it("payment provider timeout leaves no attempt so a retry can start", async () => {
    const repo = createMemoryPaymentRepository();
    const failing = createPaymentServices({
      payments: repo,
      provider: new TimeoutOnCreate(),
      orders: orders(),
    });
    await expect(
      failing.startPayment("o1", "https://store.local/return"),
    ).rejects.toBeInstanceOf(UnavailableError);
    const retry = createPaymentServices({
      payments: repo,
      provider: new MockPaymentProvider(),
      orders: orders(),
    });
    const started = await retry.startPayment("o1", "https://store.local/return");
    expect(started.paymentId).toMatch(/^mock-pay-/);
    expect(
      await retry.listPaymentsForOrder(staffPrincipal("ops", ["order_management"]), "o1"),
    ).toHaveLength(1);
  });

  it("provider timeout on poll does not change the stored attempt", async () => {
    const provider = new TimeoutOnPoll();
    const payments = createPaymentServices({
      payments: createMemoryPaymentRepository(),
      provider,
      orders: orders(),
    });
    const started = await payments.startPayment("o1", "https://store.local/return");
    await expect(payments.observeReturn(started.paymentId)).rejects.toBeInstanceOf(
      UnavailableError,
    );
    const listed = await payments.listPaymentsForOrder(
      staffPrincipal("ops", ["order_management"]),
      "o1",
    );
    expect(listed[0]?.status).toBe("CREATED");
  });

  it("duplicate callback stores one event and keeps SUCCEEDED", async () => {
    const payments = createPaymentServices({
      payments: createMemoryPaymentRepository(),
      provider: new MockPaymentProvider(),
      orders: orders(),
    });
    const started = await payments.startPayment("o1", "https://store.local/return");
    const body = webhook(started.paymentId, "evt-dup", "succeeded");
    const first = await payments.handleWebhook(body, { "x-mock-signature": "ok" });
    const replay = await payments.handleWebhook(body, { "x-mock-signature": "ok" });
    expect(first.status).toBe("SUCCEEDED");
    expect(replay.status).toBe("SUCCEEDED");
    expect(replay.id).toBe(first.id);
  });

  it("delayed callback after the browser never returns still marks the attempt paid", async () => {
    const payments = createPaymentServices({
      payments: createMemoryPaymentRepository(),
      provider: new MockPaymentProvider(),
      orders: orders(),
    });
    const started = await payments.startPayment("o1", "https://store.local/return");
    const paid = await payments.handleWebhook(
      webhook(started.paymentId, "evt-late", "succeeded"),
      { "x-mock-signature": "ok" },
    );
    expect(paid.status).toBe("SUCCEEDED");
  });

  it("payment succeeds after the browser closes without observeReturn", async () => {
    const payments = createPaymentServices({
      payments: createMemoryPaymentRepository(),
      provider: new MockPaymentProvider(),
      orders: orders(),
    });
    const started = await payments.startPayment("o1", "https://store.local/return");
    const paid = await payments.handleWebhook(
      webhook(started.paymentId, "evt-closed", "succeeded"),
      { "x-mock-signature": "ok" },
    );
    expect(paid.status).toBe("SUCCEEDED");
    await expect(
      payments.startPayment("o1", "https://store.local/return"),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("webhook delayed past local expire is ignored; EXPIRED stays terminal", async () => {
    let now = new Date("2026-09-12T10:00:00.000Z");
    const payments = createPaymentServices({
      payments: createMemoryPaymentRepository(),
      provider: new MockPaymentProvider(),
      orders: orders(),
      clock: { now: () => now },
    });
    const started = await payments.startPayment("o1", "https://store.local/return");
    now = new Date("2026-09-12T10:16:00.000Z");
    expect(await payments.expireDue()).toBe(1);
    const late = await payments.handleWebhook(
      webhook(started.paymentId, "evt-after-expire", "succeeded"),
      { "x-mock-signature": "ok" },
    );
    expect(late.status).toBe("EXPIRED");
  });

  it("refund requested twice: first wins, second is a conflict", async () => {
    const provider = new MockPaymentProvider();
    const payments = createPaymentServices({
      payments: createMemoryPaymentRepository(),
      provider,
      orders: orders(),
    });
    const started = await payments.startPayment("o1", "https://store.local/return");
    provider.succeed(started.paymentId);
    await payments.getPaymentStatus(started.paymentId);
    const first = await payments.refundPayment(started.paymentId, 4500);
    expect(first.status).toBe("REFUNDED");
    await expect(payments.refundPayment(started.paymentId, 4500)).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("records a second provider that times out without depending on MockPaymentProvider", async () => {
    const provider: PaymentProvider = {
      name: "recording",
      async createPayment() {
        throw new Error("timed out contacting provider");
      },
      async getPaymentStatus() {
        return "CREATED";
      },
      async cancelPayment() {
        return "CANCELLED";
      },
      async refundPayment() {
        return "REFUNDED";
      },
      async verifyWebhook() {
        throw new Error("unused");
      },
      normalizeStatus() {
        return "CREATED";
      },
    };
    const payments = createPaymentServices({
      payments: createMemoryPaymentRepository(),
      provider,
      orders: orders(),
    });
    await expect(
      payments.startPayment("o9", "https://store.local/return"),
    ).rejects.toBeInstanceOf(UnavailableError);
  });
});
