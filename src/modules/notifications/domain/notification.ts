export const NOTIFICATION_EVENTS = [
  "order.created",
  "payment.pending",
  "payment.successful",
  "payment.failed",
  "order.processing",
  "order.shipped",
  "order.delivered",
  "order.cancelled",
  "refund.initiated",
  "refund.completed",
  "password.reset",
] as const;

export type NotificationEvent = (typeof NOTIFICATION_EVENTS)[number];

export type NotificationStatus = "PENDING" | "SENT" | "FAILED";

export type NotificationEntityType = "order" | "payment" | "user";

export interface NotificationAttempt {
  id: string;
  notificationId: string;
  status: NotificationStatus;
  error: string | null;
  createdAt: Date;
}

export interface NotificationRecord {
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
  attempts: NotificationAttempt[];
}

export function isNotificationEvent(value: string): value is NotificationEvent {
  return (NOTIFICATION_EVENTS as readonly string[]).includes(value);
}

export function notificationIdempotencyKey(
  event: NotificationEvent,
  entityType: NotificationEntityType,
  entityId: string,
  uniqueSuffix?: string,
): string {
  if (event === "password.reset") {
    return `password.reset:${entityType}:${entityId}:${uniqueSuffix ?? crypto.randomUUID()}`;
  }
  return `${event}:${entityType}:${entityId}`;
}

const SECRET_KEY = /password|passwd|secret|token|cookie|authorization|session/i;

export function sanitizeNotificationPayload(
  payload: Record<string, string | number>,
): Record<string, string | number> {
  const clean: Record<string, string | number> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (SECRET_KEY.test(key.replaceAll(/[_-]/g, ""))) {
      continue;
    }
    if (typeof value === "string" && value.length > 400) {
      clean[key] = value.slice(0, 400);
      continue;
    }
    clean[key] = value;
  }
  return clean;
}

export function clipNotificationError(error: unknown): string {
  const text = error instanceof Error ? error.message : "send_failed";
  return text.replaceAll(/token=[^&\s]+/gi, "token=redacted").slice(0, 240);
}

/** Maps a persisted payment attempt status onto transactional events. */
export function notificationEventsForPaymentStatus(status: string): NotificationEvent[] {
  switch (status) {
    case "CREATED":
    case "PENDING":
    case "AUTHORIZED":
      return ["payment.pending"];
    case "SUCCEEDED":
      return ["payment.successful"];
    case "FAILED":
    case "EXPIRED":
    case "CANCELLED":
      return ["payment.failed"];
    case "REFUND_PENDING":
      return ["refund.initiated"];
    case "REFUNDED":
    case "PARTIALLY_REFUNDED":
      return ["refund.initiated", "refund.completed"];
    default:
      return [];
  }
}
