import type { PaymentProvider } from "../application/ports";

/**
 * Development and test provider. No network, no secrets.
 * Webhooks are accepted when `x-mock-signature` equals `ok`.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";
  private seq = 0;

  async createPayment(input: {
    orderId: string;
    amountMinor: number;
    currency: "BYN";
    returnUrl: string;
  }): Promise<{ paymentId: string; redirectUrl: string }> {
    this.seq += 1;
    const paymentId = `mock-pay-${this.seq}`;
    const url = new URL(input.returnUrl, "https://store.local");
    url.searchParams.set("paymentId", paymentId);
    url.searchParams.set("orderId", input.orderId);
    return { paymentId, redirectUrl: url.toString() };
  }

  async verifyWebhook(
    rawBody: string,
    headers: Readonly<Record<string, string>>,
  ): Promise<{ providerEventId: string; type: "succeeded" | "failed" | "cancelled" }> {
    if (headers["x-mock-signature"] !== "ok") {
      throw new Error("invalid_signature");
    }
    const body = JSON.parse(rawBody) as {
      eventId?: string;
      type?: "succeeded" | "failed" | "cancelled";
    };
    if (!body.eventId || !body.type) {
      throw new Error("invalid_payload");
    }
    return { providerEventId: body.eventId, type: body.type };
  }
}
