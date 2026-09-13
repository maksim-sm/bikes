import {
  clipNotificationError,
  isNotificationEvent,
  notificationIdempotencyKey,
  sanitizeNotificationPayload,
  type NotificationEntityType,
  type NotificationEvent,
  type NotificationRecord,
} from "../domain/notification";
import type { Clock, NotificationChannel, NotificationRepository } from "./ports";

export interface DispatchNotificationInput {
  event: NotificationEvent;
  entityType: NotificationEntityType;
  entityId: string;
  recipientEmail: string;
  payload?: Record<string, string | number>;
  /** One-time secrets for the channel only. Never written to the outbox. */
  secret?: { urlToken?: string };
}

export interface NotificationServices {
  /**
   * Persist an attempt and send. Never throws: a channel failure is stored
   * as FAILED so the caller’s commerce transaction stays committed.
   */
  dispatch(input: DispatchNotificationInput): Promise<NotificationRecord | null>;
  listByEntity(
    entityType: NotificationEntityType,
    entityId: string,
  ): Promise<NotificationRecord[]>;
}

export function createNotificationServices(deps: {
  notifications: NotificationRepository;
  channel: NotificationChannel;
  clock?: Clock;
}): NotificationServices {
  const clock = deps.clock ?? { now: () => new Date() };

  return {
    async dispatch(input) {
      try {
        if (
          !isNotificationEvent(input.event) ||
          input.recipientEmail.trim().length === 0
        ) {
          return null;
        }
        const now = clock.now();
        const payload = sanitizeNotificationPayload(input.payload ?? {});
        const idempotencyKey = notificationIdempotencyKey(
          input.event,
          input.entityType,
          input.entityId,
        );
        const existing = await deps.notifications.findByIdempotencyKey(idempotencyKey);
        if (existing?.status === "SENT") {
          return existing;
        }
        const record = await deps.notifications.save({
          id: existing?.id ?? crypto.randomUUID(),
          event: input.event,
          entityType: input.entityType,
          entityId: input.entityId,
          recipientEmail: input.recipientEmail,
          channel: "email",
          status: "PENDING",
          idempotencyKey,
          payload,
          lastError: null,
          createdAt: existing?.createdAt ?? now,
          updatedAt: now,
          sentAt: null,
        });
        try {
          await deps.channel.send({
            event: input.event,
            recipientEmail: input.recipientEmail,
            payload,
            ...(input.secret ? { secret: input.secret } : {}),
          });
          const sentAt = clock.now();
          const sent = await deps.notifications.save({
            ...record,
            status: "SENT",
            lastError: null,
            updatedAt: sentAt,
            sentAt,
          });
          await deps.notifications.appendAttempt({
            id: crypto.randomUUID(),
            notificationId: record.id,
            status: "SENT",
            error: null,
            createdAt: sentAt,
          });
          return (await deps.notifications.findByIdempotencyKey(idempotencyKey)) ?? sent;
        } catch (error) {
          const failedAt = clock.now();
          const lastError = clipNotificationError(error);
          const failed = await deps.notifications.save({
            ...record,
            status: "FAILED",
            lastError,
            updatedAt: failedAt,
            sentAt: null,
          });
          await deps.notifications.appendAttempt({
            id: crypto.randomUUID(),
            notificationId: record.id,
            status: "FAILED",
            error: lastError,
            createdAt: failedAt,
          });
          return (
            (await deps.notifications.findByIdempotencyKey(idempotencyKey)) ?? failed
          );
        }
      } catch {
        return null;
      }
    },

    async listByEntity(entityType, entityId) {
      return deps.notifications.listByEntity(entityType, entityId);
    },
  };
}
