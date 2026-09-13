import type {
  NotificationAttempt,
  NotificationEntityType,
  NotificationEvent,
  NotificationRecord,
  NotificationStatus,
} from "../domain/notification";

export interface Clock {
  now(): Date;
}

export interface NotificationWrite {
  id: string;
  event: NotificationEvent;
  entityType: NotificationEntityType;
  entityId: string;
  recipientEmail: string;
  channel: "email";
  status: NotificationStatus;
  idempotencyKey: string;
  payload: Record<string, string | number>;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
  sentAt: Date | null;
}

export interface NotificationRepository {
  findByIdempotencyKey(key: string): Promise<NotificationRecord | null>;
  save(notification: NotificationWrite): Promise<NotificationRecord>;
  appendAttempt(attempt: NotificationAttempt): Promise<NotificationAttempt>;
  listByEntity(
    entityType: NotificationEntityType,
    entityId: string,
  ): Promise<NotificationRecord[]>;
  listFailed(limit?: number): Promise<NotificationRecord[]>;
}

export interface NotificationChannel {
  send(input: {
    event: NotificationEvent;
    recipientEmail: string;
    payload: Record<string, string | number>;
    secret?: { urlToken?: string };
  }): Promise<void>;
}
