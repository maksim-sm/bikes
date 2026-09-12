import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { applyProviderEvent, canStartPayment, type Payment } from "../domain/payment";
import type { PaymentOrder, PaymentProvider, PaymentRepository } from "./ports";

export interface PaymentServices {
  startPayment(
    orderId: string,
    returnUrl: string,
  ): Promise<{
    paymentId: string;
    redirectUrl: string;
  }>;
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
  return {
    async startPayment(orderId, returnUrl) {
      const existing = await deps.payments.listByOrder(orderId);
      if (!canStartPayment(existing)) {
        throw new ConflictError("order already has a pending or succeeded payment", {
          orderId,
        });
      }
      const due = await deps.orders.amountDueMinor(orderId);
      const created = await deps.provider.createPayment({
        orderId,
        amountMinor: due.amountMinor,
        currency: due.currency,
        returnUrl,
      });
      await deps.payments.save({
        id: created.paymentId,
        orderId,
        provider: deps.provider.name,
        providerPaymentId: created.paymentId,
        amountMinor: due.amountMinor,
        currency: "BYN",
        status: "PENDING",
      });
      return created;
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

      let body: { paymentId?: string };
      try {
        body = JSON.parse(rawBody) as { paymentId?: string };
      } catch {
        throw new ValidationError("webhook body is not JSON");
      }
      if (!body.paymentId) {
        throw new ValidationError("webhook is missing paymentId");
      }

      const payment = await deps.payments.findById(body.paymentId);
      if (!payment) {
        throw new NotFoundError("payment not found", { paymentId: body.paymentId });
      }

      let status;
      try {
        status = applyProviderEvent(payment, verified.type);
      } catch {
        throw new ConflictError("payment is not pending", { paymentId: payment.id });
      }

      const updated = await deps.payments.save({ ...payment, status });
      await deps.payments.saveEvent({
        id: verified.providerEventId,
        paymentId: payment.id,
        provider: deps.provider.name,
        providerEventId: verified.providerEventId,
        type: verified.type,
      });
      await deps.orders.applyEvent(payment.orderId, { type: verified.type });
      return updated;
    },
  };
}
