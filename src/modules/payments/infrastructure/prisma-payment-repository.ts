import { prisma, type PrismaClient } from "@/lib/db";
import type { PaymentStatus, ProviderEvent } from "../domain/payment";
import { isPaymentTimedOut, type PaymentAttempt } from "../domain/payment";
import type { NormalizedPaymentStatus } from "../domain/status";
import type { PaymentRepository } from "../application/ports";

function toAttempt(row: {
  id: string;
  orderId: string;
  provider: string;
  providerPaymentId: string | null;
  idempotencyKey: string | null;
  amountMinor: number;
  currency: string;
  status: PaymentStatus;
  expiresAt: Date | null;
}): PaymentAttempt {
  return {
    id: row.id,
    orderId: row.orderId,
    provider: row.provider,
    providerPaymentId: row.providerPaymentId,
    amountMinor: row.amountMinor,
    currency: "BYN",
    status: row.status,
    idempotencyKey: row.idempotencyKey,
    expiresAt: row.expiresAt,
  };
}

function eventData(row: { data: unknown }): {
  providerPaymentId: string;
  status: NormalizedPaymentStatus;
} {
  if (row.data !== null && typeof row.data === "object") {
    const record = row.data as { providerPaymentId?: unknown; status?: unknown };
    if (
      typeof record.providerPaymentId === "string" &&
      typeof record.status === "string"
    ) {
      return {
        providerPaymentId: record.providerPaymentId,
        status: record.status as NormalizedPaymentStatus,
      };
    }
  }
  return { providerPaymentId: "", status: "CREATED" };
}

function toEvent(row: {
  id: string;
  paymentId: string;
  provider: string;
  providerEventId: string;
  type: string;
  data: unknown;
}): ProviderEvent {
  const data = eventData(row);
  return {
    id: row.id,
    paymentId: row.paymentId,
    provider: row.provider,
    providerEventId: row.providerEventId,
    providerPaymentId: data.providerPaymentId,
    rawType: row.type,
    status: data.status,
  };
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function findStored(
  client: PrismaClient,
  id: string,
  providerPaymentId: string | null,
) {
  if (UUID_RE.test(id)) {
    const byId = await client.payment.findUnique({ where: { id } });
    if (byId) {
      return byId;
    }
  }
  if (providerPaymentId) {
    return client.payment.findFirst({
      where: { providerPaymentId },
    });
  }
  return null;
}

export function createPrismaPaymentRepository(
  client: PrismaClient = prisma,
): PaymentRepository {
  return {
    async listByOrder(orderId) {
      const rows = await client.payment.findMany({
        where: { orderId },
        orderBy: { createdAt: "asc" },
      });
      return rows.map(toAttempt);
    },
    async listExpiredOpen(now) {
      const rows = await client.payment.findMany({
        where: { status: { in: ["CREATED", "PENDING"] }, expiresAt: { not: null } },
      });
      return rows.map(toAttempt).filter((row) => isPaymentTimedOut(row, now));
    },
    async save(payment) {
      const data = {
        orderId: payment.orderId,
        provider: payment.provider,
        providerPaymentId: payment.providerPaymentId,
        idempotencyKey: payment.idempotencyKey,
        amountMinor: payment.amountMinor,
        currency: payment.currency,
        status: payment.status,
        expiresAt: payment.expiresAt,
      };
      const existing = await findStored(client, payment.id, payment.providerPaymentId);
      const row = existing
        ? await client.payment.update({ where: { id: existing.id }, data })
        : await client.payment.create({
            data: {
              ...(UUID_RE.test(payment.id) ? { id: payment.id } : {}),
              ...data,
            },
          });
      return toAttempt(row);
    },
    async findById(id) {
      const row = await findStored(client, id, id);
      return row ? toAttempt(row) : null;
    },
    async findByProviderPaymentId(provider, providerPaymentId) {
      const row = await client.payment.findUnique({
        where: { provider_providerPaymentId: { provider, providerPaymentId } },
      });
      return row ? toAttempt(row) : null;
    },
    async findEvent(provider, providerEventId) {
      const row = await client.paymentEvent.findUnique({
        where: { provider_providerEventId: { provider, providerEventId } },
      });
      return row ? toEvent(row) : null;
    },
    async saveEvent(event) {
      const row = await client.paymentEvent.create({
        data: {
          ...(UUID_RE.test(event.id) ? { id: event.id } : {}),
          paymentId: event.paymentId,
          provider: event.provider,
          providerEventId: event.providerEventId,
          type: event.rawType,
          occurredAt: new Date(),
          data: {
            providerPaymentId: event.providerPaymentId,
            status: event.status,
          },
        },
      });
      return toEvent(row);
    },
  };
}
