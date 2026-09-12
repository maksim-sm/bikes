import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  ProviderPaymentRef,
  RefundPaymentInput,
  VerifiedProviderEvent,
} from "../application/ports";
import type { PaymentProviderName } from "../domain/provider";
import { normalizePaymentStatus, type NormalizedPaymentStatus } from "../domain/status";

interface MockCharge {
  paymentId: string;
  orderId: string;
  amountMinor: number;
  currency: "BYN";
  status: NormalizedPaymentStatus;
  refundedMinor: number;
  redirectUrl: string;
}

/**
 * Development and test provider. No network, no secrets.
 * Webhooks are accepted when `x-mock-signature` equals `ok`.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name: PaymentProviderName;
  private seq = 0;
  private readonly byId = new Map<string, MockCharge>();
  private readonly byIdempotencyKey = new Map<string, MockCharge>();
  private readonly refundKeys = new Set<string>();

  constructor(name: PaymentProviderName = "mock") {
    this.name = name;
  }

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    const existing = this.byIdempotencyKey.get(input.idempotencyKey);
    if (existing) {
      return { paymentId: existing.paymentId, redirectUrl: existing.redirectUrl };
    }
    this.seq += 1;
    const paymentId = `${this.name}-pay-${this.seq}`;
    const url = new URL(input.returnUrl, "https://store.local");
    url.searchParams.set("paymentId", paymentId);
    url.searchParams.set("orderId", input.orderId);
    const charge: MockCharge = {
      paymentId,
      orderId: input.orderId,
      amountMinor: input.amountMinor,
      currency: input.currency,
      status: "CREATED",
      refundedMinor: 0,
      redirectUrl: url.toString(),
    };
    this.byId.set(paymentId, charge);
    this.byIdempotencyKey.set(input.idempotencyKey, charge);
    return { paymentId, redirectUrl: charge.redirectUrl };
  }

  async getPaymentStatus(input: ProviderPaymentRef): Promise<NormalizedPaymentStatus> {
    return this.require(input.providerPaymentId).status;
  }

  async cancelPayment(input: ProviderPaymentRef): Promise<NormalizedPaymentStatus> {
    const charge = this.require(input.providerPaymentId);
    if (
      charge.status !== "CREATED" &&
      charge.status !== "PENDING" &&
      charge.status !== "AUTHORIZED"
    ) {
      throw new Error("payment_not_cancellable");
    }
    charge.status = "CANCELLED";
    return charge.status;
  }

  async refundPayment(input: RefundPaymentInput): Promise<NormalizedPaymentStatus> {
    const charge = this.require(input.providerPaymentId);
    if (this.refundKeys.has(input.idempotencyKey)) {
      return charge.status;
    }
    if (charge.status !== "SUCCEEDED" && charge.status !== "PARTIALLY_REFUNDED") {
      throw new Error("payment_not_refundable");
    }
    if (
      input.amountMinor <= 0 ||
      charge.refundedMinor + input.amountMinor > charge.amountMinor
    ) {
      throw new Error("refund_out_of_range");
    }
    charge.refundedMinor += input.amountMinor;
    charge.status =
      charge.refundedMinor === charge.amountMinor ? "REFUNDED" : "PARTIALLY_REFUNDED";
    this.refundKeys.add(input.idempotencyKey);
    return charge.status;
  }

  async verifyWebhook(
    rawBody: string,
    headers: Readonly<Record<string, string>>,
  ): Promise<VerifiedProviderEvent> {
    if (headers["x-mock-signature"] !== "ok") {
      throw new Error("invalid_signature");
    }
    let body: { paymentId?: string; eventId?: string; type?: string };
    try {
      body = JSON.parse(rawBody) as {
        paymentId?: string;
        eventId?: string;
        type?: string;
      };
    } catch {
      throw new Error("invalid_payload");
    }
    if (!body.eventId || !body.type || !body.paymentId) {
      throw new Error("invalid_payload");
    }
    return {
      providerEventId: body.eventId,
      providerPaymentId: body.paymentId,
      rawType: body.type,
      status: this.normalizeStatus(body.type),
    };
  }

  normalizeStatus(rawStatus: string): NormalizedPaymentStatus {
    if (rawStatus.trim().toLowerCase() === "ok") {
      return "SUCCEEDED";
    }
    return normalizePaymentStatus(rawStatus);
  }

  /** Register a charge that already exists (demo seed / tests). */
  seedCharge(input: {
    paymentId: string;
    orderId: string;
    amountMinor: number;
    status?: NormalizedPaymentStatus;
  }): void {
    this.byId.set(input.paymentId, {
      paymentId: input.paymentId,
      orderId: input.orderId,
      amountMinor: input.amountMinor,
      currency: "BYN",
      status: input.status ?? "SUCCEEDED",
      refundedMinor: 0,
      redirectUrl: "https://store.local/return",
    });
  }

  /** Test helpers: move a charge without pretending the browser did it. */
  markPending(providerPaymentId: string): void {
    this.require(providerPaymentId).status = "PENDING";
  }

  authorize(providerPaymentId: string): void {
    this.require(providerPaymentId).status = "AUTHORIZED";
  }

  succeed(providerPaymentId: string): void {
    this.require(providerPaymentId).status = "SUCCEEDED";
  }

  expire(providerPaymentId: string): void {
    this.require(providerPaymentId).status = "EXPIRED";
  }

  beginRefund(providerPaymentId: string): void {
    this.require(providerPaymentId).status = "REFUND_PENDING";
  }

  private require(providerPaymentId: string): MockCharge {
    const charge = this.byId.get(providerPaymentId);
    if (!charge) {
      throw new Error("payment_not_found");
    }
    return charge;
  }
}
