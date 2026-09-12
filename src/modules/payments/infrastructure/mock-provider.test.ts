import { describe, expect, it } from "vitest";
import { MockPaymentProvider } from "./mock-provider";

describe("MockPaymentProvider", () => {
  it("returns the same charge for a repeated idempotency key", async () => {
    const provider = new MockPaymentProvider();
    const input = {
      orderId: "o1",
      amountMinor: 100,
      currency: "BYN" as const,
      returnUrl: "https://store.local/return",
      idempotencyKey: "pay:o1:1",
    };
    const first = await provider.createPayment(input);
    const retry = await provider.createPayment(input);
    expect(retry.paymentId).toBe(first.paymentId);
    expect(await provider.getPaymentStatus({ providerPaymentId: first.paymentId })).toBe(
      "CREATED",
    );
  });

  it("cancels and refunds in memory", async () => {
    const provider = new MockPaymentProvider("alt");
    expect(provider.name).toBe("alt");
    const created = await provider.createPayment({
      orderId: "o1",
      amountMinor: 500,
      currency: "BYN",
      returnUrl: "/return",
      idempotencyKey: "pay:o1:1",
    });
    expect(created.paymentId).toMatch(/^alt-pay-/);
    expect(await provider.cancelPayment({ providerPaymentId: created.paymentId })).toBe(
      "CANCELLED",
    );

    const paid = await provider.createPayment({
      orderId: "o1",
      amountMinor: 500,
      currency: "BYN",
      returnUrl: "/return",
      idempotencyKey: "pay:o1:2",
    });
    provider.succeed(paid.paymentId);
    expect(
      await provider.refundPayment({
        providerPaymentId: paid.paymentId,
        amountMinor: 200,
        idempotencyKey: "refund:a:200",
      }),
    ).toBe("PARTIALLY_REFUNDED");
    expect(
      await provider.refundPayment({
        providerPaymentId: paid.paymentId,
        amountMinor: 200,
        idempotencyKey: "refund:a:200",
      }),
    ).toBe("PARTIALLY_REFUNDED");
    expect(
      await provider.refundPayment({
        providerPaymentId: paid.paymentId,
        amountMinor: 300,
        idempotencyKey: "refund:a:300",
      }),
    ).toBe("REFUNDED");
  });

  it("verifies a signed webhook into a normalized event", async () => {
    const provider = new MockPaymentProvider();
    await expect(
      provider.verifyWebhook("{}", { "x-mock-signature": "nope" }),
    ).rejects.toThrow("invalid_signature");
    const event = await provider.verifyWebhook(
      JSON.stringify({ paymentId: "mock-pay-1", eventId: "e1", type: "paid" }),
      { "x-mock-signature": "ok" },
    );
    expect(event).toEqual({
      providerEventId: "e1",
      providerPaymentId: "mock-pay-1",
      rawType: "paid",
      status: "SUCCEEDED",
    });
    expect(provider.normalizeStatus("ok")).toBe("SUCCEEDED");
  });
});
