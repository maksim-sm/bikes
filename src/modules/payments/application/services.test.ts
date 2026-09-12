import { describe, expect, it } from "vitest";
import { ConflictError, ValidationError } from "@/lib/errors";
import {
  applyProviderEvent,
  canStartPayment,
  type PaymentAttempt,
} from "../domain/payment";
import { paymentAttemptIdempotencyKey } from "../domain/provider";
import { createMemoryPaymentRepository } from "../infrastructure/memory-payment-repository";
import { MockPaymentProvider } from "../infrastructure/mock-provider";
import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentOrder,
  PaymentProvider,
  ProviderPaymentRef,
  RefundPaymentInput,
  VerifiedProviderEvent,
} from "./ports";
import { createPaymentServices } from "./services";
import { normalizePaymentStatus, type NormalizedPaymentStatus } from "../domain/status";

function attempt(overrides: Partial<PaymentAttempt> = {}): PaymentAttempt {
  return {
    id: "p1",
    orderId: "o1",
    provider: "mock",
    providerPaymentId: "p1",
    amountMinor: 100,
    currency: "BYN",
    status: "PENDING",
    idempotencyKey: paymentAttemptIdempotencyKey("o1", 1),
    ...overrides,
  };
}

function orders(): PaymentOrder {
  return {
    async amountDueMinor() {
      return { amountMinor: 4500, currency: "BYN" };
    },
    async applyEvent() {},
  };
}

/**
 * Second adapter used only in tests. Proves services talk to PaymentProvider,
 * not MockPaymentProvider.
 */
class RecordingPaymentProvider implements PaymentProvider {
  readonly name = "recording";
  readonly calls: string[] = [];
  private seq = 0;
  private readonly byKey = new Map<string, string>();
  private readonly status = new Map<string, NormalizedPaymentStatus>();

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    this.calls.push(`createPayment:${input.idempotencyKey}`);
    const existing = this.byKey.get(input.idempotencyKey);
    if (existing) {
      return { paymentId: existing, redirectUrl: `${input.returnUrl}?pid=${existing}` };
    }
    this.seq += 1;
    const paymentId = `rec-${this.seq}`;
    this.byKey.set(input.idempotencyKey, paymentId);
    this.status.set(paymentId, "PENDING");
    return { paymentId, redirectUrl: `${input.returnUrl}?pid=${paymentId}` };
  }

  async getPaymentStatus(input: ProviderPaymentRef): Promise<NormalizedPaymentStatus> {
    this.calls.push("getPaymentStatus");
    return this.status.get(input.providerPaymentId) ?? "PENDING";
  }

  async cancelPayment(input: ProviderPaymentRef): Promise<NormalizedPaymentStatus> {
    this.calls.push("cancelPayment");
    this.status.set(input.providerPaymentId, "CANCELLED");
    return "CANCELLED";
  }

  async refundPayment(input: RefundPaymentInput): Promise<NormalizedPaymentStatus> {
    this.calls.push(`refundPayment:${input.idempotencyKey}`);
    this.status.set(input.providerPaymentId, "REFUNDED");
    return "REFUNDED";
  }

  async verifyWebhook(
    rawBody: string,
    _headers: Readonly<Record<string, string>>,
  ): Promise<VerifiedProviderEvent> {
    this.calls.push("verifyWebhook");
    const body = JSON.parse(rawBody) as {
      eventId: string;
      type: string;
      paymentId: string;
    };
    return {
      providerEventId: body.eventId,
      providerPaymentId: body.paymentId,
      rawType: body.type,
      status: this.normalizeStatus(body.type),
    };
  }

  normalizeStatus(rawStatus: string): NormalizedPaymentStatus {
    return normalizePaymentStatus(rawStatus);
  }

  markSucceeded(providerPaymentId: string): void {
    this.status.set(providerPaymentId, "SUCCEEDED");
  }
}

describe("payment rules", () => {
  it("allows only one pending attempt per order", () => {
    const pending = attempt();
    expect(canStartPayment([pending])).toBe(false);
    expect(applyProviderEvent(pending, "SUCCEEDED")).toBe("SUCCEEDED");
  });

  it("applies refund statuses only after a succeeded attempt", () => {
    const pending = attempt();
    expect(() => applyProviderEvent(pending, "REFUNDED")).toThrow(
      "payment_not_refundable",
    );
    expect(applyProviderEvent(attempt({ status: "SUCCEEDED" }), "REFUNDED")).toBe(
      "REFUNDED",
    );
    expect(
      applyProviderEvent(attempt({ status: "REFUNDED" }), "PARTIALLY_REFUNDED"),
    ).toBe("REFUNDED");
  });
});

describe("payment services", () => {
  it("starts a mock payment and applies an idempotent webhook", async () => {
    const payments = createPaymentServices({
      payments: createMemoryPaymentRepository(),
      provider: new MockPaymentProvider(),
      orders: orders(),
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

  it("resolves the attempt from the verified event, not from raw JSON", async () => {
    const provider = new MockPaymentProvider();
    const payments = createPaymentServices({
      payments: createMemoryPaymentRepository(),
      provider,
      orders: orders(),
    });
    const started = await payments.startPayment("o1", "https://store.local/return");
    const verified = await provider.verifyWebhook(
      JSON.stringify({
        paymentId: started.paymentId,
        eventId: "evt-2",
        type: "failed",
      }),
      { "x-mock-signature": "ok" },
    );
    expect(verified.providerPaymentId).toBe(started.paymentId);
    expect(verified.status).toBe("FAILED");
    const updated = await payments.handleWebhook(
      JSON.stringify({
        paymentId: started.paymentId,
        eventId: "evt-2",
        type: "failed",
      }),
      { "x-mock-signature": "ok" },
    );
    expect(updated.status).toBe("FAILED");
  });

  it("cancels, polls, and refunds through the provider port", async () => {
    const provider = new MockPaymentProvider();
    const payments = createPaymentServices({
      payments: createMemoryPaymentRepository(),
      provider,
      orders: orders(),
    });
    const started = await payments.startPayment("o1", "https://store.local/return");
    expect(await payments.getPaymentStatus(started.paymentId)).toBe("PENDING");

    const cancelled = await payments.cancelPayment(started.paymentId);
    expect(cancelled.status).toBe("CANCELLED");
    expect(await payments.getPaymentStatus(started.paymentId)).toBe("CANCELLED");

    const retry = await payments.startPayment("o1", "https://store.local/return");
    provider.succeed(retry.paymentId);
    expect(await payments.getPaymentStatus(retry.paymentId)).toBe("SUCCEEDED");

    const refunded = await payments.refundPayment(retry.paymentId, 4500);
    expect(refunded.status).toBe("REFUNDED");
    await expect(payments.refundPayment(retry.paymentId, 1)).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("runs the same use cases against a second provider implementation", async () => {
    const provider = new RecordingPaymentProvider();
    const applied: string[] = [];
    const payments = createPaymentServices({
      payments: createMemoryPaymentRepository(),
      provider,
      orders: {
        async amountDueMinor() {
          return { amountMinor: 4500, currency: "BYN" };
        },
        async applyEvent(_orderId, event) {
          applied.push(event.type);
        },
      },
    });

    const started = await payments.startPayment("o9", "https://store.local/return");
    expect(started.paymentId).toBe("rec-1");
    expect(provider.calls[0]).toMatch(/^createPayment:pay:o9:1$/);

    const cancelled = await payments.cancelPayment(started.paymentId);
    expect(cancelled.status).toBe("CANCELLED");
    expect(applied).toEqual(["cancelled"]);

    const next = await payments.startPayment("o9", "https://store.local/return");
    expect(next.paymentId).toBe("rec-2");
    provider.markSucceeded(next.paymentId);
    const paid = await payments.handleWebhook(
      JSON.stringify({
        paymentId: next.paymentId,
        eventId: "rec-evt",
        type: "succeeded",
      }),
      {},
    );
    expect(paid.status).toBe("SUCCEEDED");
    expect(applied).toEqual(["cancelled", "succeeded"]);

    const refunded = await payments.refundPayment(next.paymentId, 4500);
    expect(refunded.status).toBe("REFUNDED");
    expect(provider.calls).toContain("refundPayment:refund:rec-2:4500");
    expect(applied).toEqual(["cancelled", "succeeded", "refunded"]);
  });
});

describe("validation", () => {
  it("rejects a refund that exceeds the attempt", async () => {
    const provider = new MockPaymentProvider();
    const payments = createPaymentServices({
      payments: createMemoryPaymentRepository(),
      provider,
      orders: orders(),
    });
    const started = await payments.startPayment("o1", "https://store.local/return");
    provider.succeed(started.paymentId);
    await payments.getPaymentStatus(started.paymentId);
    await expect(payments.refundPayment(started.paymentId, 99999)).rejects.toBeInstanceOf(
      ValidationError,
    );
  });
});
