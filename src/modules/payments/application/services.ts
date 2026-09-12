import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import {
  applyProviderEvent,
  canCancelPayment,
  canStartPayment,
  refundStatus,
  type Payment,
} from "../domain/payment";
import { paymentAttemptIdempotencyKey, refundIdempotencyKey } from "../domain/provider";
import {
  paymentStatusToOrderEvent,
  type NormalizedPaymentStatus,
} from "../domain/status";
import type { PaymentOrder, PaymentProvider, PaymentRepository } from "./ports";

export interface PaymentServices {
  startPayment(
    orderId: string,
    returnUrl: string,
  ): Promise<{
    paymentId: string;
    redirectUrl: string;
  }>;
  getPaymentStatus(paymentId: string): Promise<NormalizedPaymentStatus>;
  /**
   * Browser return landing. Polls the provider and applies a legal
   * transition. Query-string claims (`?status=paid`) are not accepted.
   */
  observeReturn(paymentId: string): Promise<Payment>;
  cancelPayment(paymentId: string): Promise<Payment>;
  refundPayment(paymentId: string, amountMinor: number): Promise<Payment>;
  handleWebhook(
    rawBody: string,
    headers: Readonly<Record<string, string>>,
  ): Promise<Payment>;
}

export function createPaymentServices(deps: {
  payments: PaymentRepository;
  provider: PaymentProvider;
  orders: PaymentOrder;
}): PaymentServices {
  async function requirePayment(paymentId: string): Promise<Payment> {
    const payment = await deps.payments.findById(paymentId);
    if (!payment) {
      throw new NotFoundError("payment not found", { paymentId });
    }
    return payment;
  }

  function requireProviderPaymentId(payment: Payment): string {
    if (!payment.providerPaymentId) {
      throw new ConflictError("payment has no provider reference", {
        paymentId: payment.id,
      });
    }
    return payment.providerPaymentId;
  }

  async function applyRemoteStatus(
    payment: Payment,
    status: NormalizedPaymentStatus,
    mode: "strict" | "lenient",
  ): Promise<Payment> {
    let next: NormalizedPaymentStatus;
    try {
      next = applyProviderEvent(payment, status);
    } catch {
      if (mode === "lenient") {
        return payment;
      }
      throw new ConflictError("payment cannot accept this status", {
        paymentId: payment.id,
        status,
      });
    }
    if (next === payment.status) {
      return payment;
    }
    const updated = await deps.payments.save({ ...payment, status: next });
    await deps.orders.applyEvent(payment.orderId, paymentStatusToOrderEvent(next));
    return updated;
  }

  async function syncFromProvider(payment: Payment): Promise<Payment> {
    const providerPaymentId = requireProviderPaymentId(payment);
    const status = await deps.provider.getPaymentStatus({ providerPaymentId });
    return applyRemoteStatus(payment, status, "lenient");
  }

  return {
    async startPayment(orderId, returnUrl) {
      const existing = await deps.payments.listByOrder(orderId);
      if (!canStartPayment(existing)) {
        throw new ConflictError("order already has an open payment attempt", {
          orderId,
        });
      }
      const due = await deps.orders.amountDueMinor(orderId);
      const idempotencyKey = paymentAttemptIdempotencyKey(orderId, existing.length + 1);
      const created = await deps.provider.createPayment({
        orderId,
        amountMinor: due.amountMinor,
        currency: due.currency,
        returnUrl,
        idempotencyKey,
      });
      const payment = await deps.payments.save({
        id: created.paymentId,
        orderId,
        provider: deps.provider.name,
        providerPaymentId: created.paymentId,
        amountMinor: due.amountMinor,
        currency: "BYN",
        status: "CREATED",
        idempotencyKey,
      });
      await deps.orders.applyEvent(orderId, paymentStatusToOrderEvent(payment.status));
      return created;
    },

    async getPaymentStatus(paymentId) {
      const updated = await syncFromProvider(await requirePayment(paymentId));
      return updated.status;
    },

    async observeReturn(paymentId) {
      return syncFromProvider(await requirePayment(paymentId));
    },

    async cancelPayment(paymentId) {
      const payment = await requirePayment(paymentId);
      if (!canCancelPayment(payment)) {
        throw new ConflictError("payment cannot be cancelled", { paymentId });
      }
      const providerPaymentId = requireProviderPaymentId(payment);
      let status: NormalizedPaymentStatus;
      try {
        status = await deps.provider.cancelPayment({ providerPaymentId });
      } catch (error) {
        if (error instanceof Error && error.message === "payment_not_found") {
          throw new NotFoundError("provider payment not found", { paymentId });
        }
        if (
          error instanceof Error &&
          (error.message === "payment_not_pending" ||
            error.message === "payment_not_cancellable")
        ) {
          throw new ConflictError("payment cannot be cancelled", { paymentId });
        }
        throw error;
      }
      return applyRemoteStatus(payment, status, "strict");
    },

    async refundPayment(paymentId, amountMinor) {
      const payment = await requirePayment(paymentId);
      try {
        refundStatus(payment, amountMinor);
      } catch (error) {
        if (error instanceof Error && error.message === "payment_not_refundable") {
          throw new ConflictError("payment is not refundable", { paymentId });
        }
        throw new ValidationError("refund amount is out of range");
      }
      const providerPaymentId = requireProviderPaymentId(payment);
      let status: NormalizedPaymentStatus;
      try {
        status = await deps.provider.refundPayment({
          providerPaymentId,
          amountMinor,
          idempotencyKey: refundIdempotencyKey(payment.id, amountMinor),
        });
      } catch (error) {
        if (error instanceof Error && error.message === "payment_not_found") {
          throw new NotFoundError("provider payment not found", { paymentId });
        }
        if (error instanceof Error && error.message === "payment_not_refundable") {
          throw new ConflictError("payment is not refundable", { paymentId });
        }
        if (error instanceof Error && error.message === "refund_out_of_range") {
          throw new ValidationError("refund amount is out of range");
        }
        throw error;
      }
      return applyRemoteStatus(payment, status, "strict");
    },

    async handleWebhook(rawBody, headers) {
      const verified = await deps.provider.verifyWebhook(rawBody, headers);
      const duplicate = await deps.payments.findEvent(
        deps.provider.name,
        verified.providerEventId,
      );
      if (duplicate) {
        const payment = await deps.payments.findById(duplicate.paymentId);
        if (!payment) {
          throw new NotFoundError("payment not found for replayed event");
        }
        return payment;
      }

      const payment = await deps.payments.findByProviderPaymentId(
        deps.provider.name,
        verified.providerPaymentId,
      );
      if (!payment) {
        throw new NotFoundError("payment not found", {
          providerPaymentId: verified.providerPaymentId,
        });
      }

      const updated = await applyRemoteStatus(payment, verified.status, "lenient");
      await deps.payments.saveEvent({
        id: verified.providerEventId,
        paymentId: payment.id,
        provider: deps.provider.name,
        providerEventId: verified.providerEventId,
        providerPaymentId: verified.providerPaymentId,
        rawType: verified.rawType,
        status: verified.status,
      });
      return updated;
    },
  };
}
