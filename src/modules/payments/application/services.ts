import { ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { requireOrderManagementRole, type Principal } from "@/modules/identity";
import {
  applyProviderEvent,
  canCancelPayment,
  canStartPayment,
  isOpenUnpaidPayment,
  isPaymentTimedOut,
  PAYMENT_TIMEOUT_MS,
  refundStatus,
  type Payment,
} from "../domain/payment";
import { paymentAttemptIdempotencyKey, refundIdempotencyKey } from "../domain/provider";
import {
  paymentStatusToOrderEvent,
  type NormalizedPaymentStatus,
} from "../domain/status";
import type { Clock, PaymentOrder, PaymentProvider, PaymentRepository } from "./ports";

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
  listPaymentsForOrder(principal: Principal, orderId: string): Promise<Payment[]>;
  refundAsStaff(
    principal: Principal,
    paymentId: string,
    amountMinor: number,
  ): Promise<Payment>;
  handleWebhook(
    rawBody: string,
    headers: Readonly<Record<string, string>>,
  ): Promise<Payment>;
  expireDue(): Promise<number>;
  expireOpenForOrders(orderIds: readonly string[]): Promise<number>;
  cancelOpenForOrder(orderId: string): Promise<void>;
}

export function createPaymentServices(deps: {
  payments: PaymentRepository;
  provider: PaymentProvider;
  orders: PaymentOrder;
  clock?: Clock;
}): PaymentServices {
  const clock = deps.clock ?? { now: () => new Date() };
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

  async function expireLocally(payment: Payment): Promise<Payment> {
    if (!isPaymentTimedOut(payment, clock.now())) {
      return payment;
    }
    return applyRemoteStatus(payment, "EXPIRED", "lenient");
  }

  async function syncFromProvider(payment: Payment): Promise<Payment> {
    const providerPaymentId = requireProviderPaymentId(payment);
    const status = await deps.provider.getPaymentStatus({ providerPaymentId });
    const synced = await applyRemoteStatus(payment, status, "lenient");
    return expireLocally(synced);
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
        expiresAt: new Date(clock.now().getTime() + PAYMENT_TIMEOUT_MS),
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

    async listPaymentsForOrder(principal, orderId) {
      requireOrderManagementRole(principal);
      return deps.payments.listByOrder(orderId);
    },

    async refundAsStaff(principal, paymentId, amountMinor) {
      requireOrderManagementRole(principal);
      return this.refundPayment(paymentId, amountMinor);
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

      const updated = await expireLocally(
        await applyRemoteStatus(payment, verified.status, "lenient"),
      );
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

    async expireDue() {
      const due = await deps.payments.listExpiredOpen(clock.now());
      let expired = 0;
      for (const payment of due) {
        const updated = await applyRemoteStatus(payment, "EXPIRED", "lenient");
        if (updated.status === "EXPIRED" && payment.status !== "EXPIRED") {
          expired += 1;
        }
      }
      return expired;
    },

    async expireOpenForOrders(orderIds) {
      let expired = 0;
      for (const orderId of new Set(orderIds)) {
        const attempts = await deps.payments.listByOrder(orderId);
        for (const payment of attempts) {
          if (!isOpenUnpaidPayment(payment.status)) {
            continue;
          }
          const updated = await applyRemoteStatus(payment, "EXPIRED", "lenient");
          if (updated.status === "EXPIRED" && payment.status !== "EXPIRED") {
            expired += 1;
          }
        }
      }
      return expired;
    },

    async cancelOpenForOrder(orderId) {
      const attempts = await deps.payments.listByOrder(orderId);
      for (const payment of attempts) {
        if (!canCancelPayment(payment)) {
          continue;
        }
        if (payment.providerPaymentId) {
          try {
            const status = await deps.provider.cancelPayment({
              providerPaymentId: payment.providerPaymentId,
            });
            await applyRemoteStatus(payment, status, "lenient");
            continue;
          } catch {
            // Provider reject still closes the local attempt so a retry can start.
          }
        }
        await applyRemoteStatus(payment, "CANCELLED", "lenient");
      }
    },
  };
}
