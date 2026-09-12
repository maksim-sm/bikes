import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { applyProviderEvent, canStartPayment, refundStatus, type Payment } from "../domain/payment";
import {
  paymentAttemptIdempotencyKey,
  refundIdempotencyKey,
} from "../domain/provider";
import { paymentStatusToOrderEvent, type NormalizedPaymentStatus } from "../domain/status";
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
      throw new ConflictError("payment has no provider reference", { paymentId: payment.id });
    }
    return payment.providerPaymentId;
  }

  async function applyRemoteStatus(
    payment: Payment,
    status: NormalizedPaymentStatus,
  ): Promise<Payment> {
    let next: NormalizedPaymentStatus;
    try {
      next = applyProviderEvent(payment, status);
    } catch {
      throw new ConflictError("payment cannot accept this status", {
        paymentId: payment.id,
        status,
      });
    }
    if (next === payment.status) {
      return payment;
    }
    const updated = await deps.payments.save({ ...payment, status: next });
    const orderEvent = paymentStatusToOrderEvent(next);
    if (orderEvent) {
      await deps.orders.applyEvent(payment.orderId, orderEvent);
    }
    return updated;
  }

  return {
    async startPayment(orderId, returnUrl) {
      const existing = await deps.payments.listByOrder(orderId);
      if (!canStartPayment(existing)) {
        throw new ConflictError("order already has a pending or succeeded payment", {
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
      await deps.payments.save({
        id: created.paymentId,
        orderId,
        provider: deps.provider.name,
        providerPaymentId: created.paymentId,
        amountMinor: due.amountMinor,
        currency: "BYN",
        status: "PENDING",
        idempotencyKey,
      });
      return created;
    },

    async getPaymentStatus(paymentId) {
      const payment = await requirePayment(paymentId);
      const providerPaymentId = requireProviderPaymentId(payment);
      const status = await deps.provider.getPaymentStatus({ providerPaymentId });
      try {
        await applyRemoteStatus(payment, status);
      } catch {
        // Illegal transitions on a poll do not hide the provider's current status.
      }
      return status;
    },

    async cancelPayment(paymentId) {
      const payment = await requirePayment(paymentId);
      const providerPaymentId = requireProviderPaymentId(payment);
      let status: NormalizedPaymentStatus;
      try {
        status = await deps.provider.cancelPayment({ providerPaymentId });
      } catch (error) {
        if (error instanceof Error && error.message === "payment_not_found") {
          throw new NotFoundError("provider payment not found", { paymentId });
        }
        if (error instanceof Error && error.message === "payment_not_pending") {
          throw new ConflictError("payment is not pending", { paymentId });
        }
        throw error;
      }
      return applyRemoteStatus(payment, status);
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
      return applyRemoteStatus(payment, status);
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

      const updated = await applyRemoteStatus(payment, verified.status);
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
