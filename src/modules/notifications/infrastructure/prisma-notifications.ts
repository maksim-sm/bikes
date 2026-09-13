import type { Prisma } from "../../../generated/prisma/client";
import { prisma, type PrismaClient } from "@/lib/db";
import type { NotificationRepository, NotificationWrite } from "../application/ports";
import type {
  NotificationAttempt,
  NotificationEntityType,
  NotificationEvent,
  NotificationRecord,
  NotificationStatus,
} from "../domain/notification";

function toRecord(row: {
  id: string;
  event: string;
  entityType: string;
  entityId: string;
  recipientEmail: string;
  channel: string;
  status: NotificationStatus;
  idempotencyKey: string;
  payload: unknown;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
  sentAt: Date | null;
  attempts: Array<{
    id: string;
    notificationId: string;
    status: NotificationStatus;
    error: string | null;
    createdAt: Date;
  }>;
}): NotificationRecord {
  return {
    id: row.id,
    event: row.event as NotificationEvent,
    entityType: row.entityType as NotificationEntityType,
    entityId: row.entityId,
    recipientEmail: row.recipientEmail,
    channel: "email",
    status: row.status,
    idempotencyKey: row.idempotencyKey,
    payload: (row.payload ?? {}) as Record<string, string | number>,
    lastError: row.lastError,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    sentAt: row.sentAt,
    attempts: row.attempts.map((attempt) => ({
      id: attempt.id,
      notificationId: attempt.notificationId,
      status: attempt.status,
      error: attempt.error,
      createdAt: attempt.createdAt,
    })),
  };
}

const withAttempts = { attempts: { orderBy: { createdAt: "asc" as const } } };

export function createPrismaNotificationRepository(
  client: PrismaClient = prisma,
): NotificationRepository {
  return {
    async findByIdempotencyKey(key) {
      const row = await client.notification.findUnique({
        where: { idempotencyKey: key },
        include: withAttempts,
      });
      return row ? toRecord(row) : null;
    },
    async save(notification: NotificationWrite) {
      const data: Prisma.NotificationUncheckedCreateInput = {
        id: notification.id,
        event: notification.event,
        entityType: notification.entityType,
        entityId: notification.entityId,
        recipientEmail: notification.recipientEmail,
        channel: notification.channel,
        status: notification.status,
        idempotencyKey: notification.idempotencyKey,
        payload: notification.payload as Prisma.InputJsonValue,
        lastError: notification.lastError,
        createdAt: notification.createdAt,
        updatedAt: notification.updatedAt,
        sentAt: notification.sentAt,
      };
      const row = await client.notification.upsert({
        where: { id: notification.id },
        create: data,
        update: {
          status: notification.status,
          payload: notification.payload as Prisma.InputJsonValue,
          lastError: notification.lastError,
          updatedAt: notification.updatedAt,
          sentAt: notification.sentAt,
        },
        include: withAttempts,
      });
      return toRecord(row);
    },
    async appendAttempt(attempt: NotificationAttempt) {
      const row = await client.notificationAttempt.create({
        data: {
          id: attempt.id,
          notificationId: attempt.notificationId,
          status: attempt.status,
          error: attempt.error,
          createdAt: attempt.createdAt,
        },
      });
      return {
        id: row.id,
        notificationId: row.notificationId,
        status: row.status,
        error: row.error,
        createdAt: row.createdAt,
      };
    },
    async listByEntity(entityType, entityId) {
      const rows = await client.notification.findMany({
        where: { entityType, entityId },
        include: withAttempts,
        orderBy: { createdAt: "desc" },
      });
      return rows.map(toRecord);
    },
    async listFailed(limit = 50) {
      const rows = await client.notification.findMany({
        where: { status: "FAILED" },
        include: withAttempts,
        orderBy: { updatedAt: "desc" },
        take: limit,
      });
      return rows.map(toRecord);
    },
  };
}
