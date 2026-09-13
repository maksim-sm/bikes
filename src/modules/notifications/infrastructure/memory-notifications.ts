import type { NotificationRepository, NotificationWrite } from "../application/ports";
import type { NotificationAttempt, NotificationRecord } from "../domain/notification";

export function createMemoryNotificationRepository(
  seed: readonly NotificationRecord[] = [],
): NotificationRepository {
  const rows = new Map<string, NotificationRecord>();
  for (const row of seed) {
    rows.set(row.id, { ...row, attempts: [...row.attempts] });
  }

  function byKey(key: string): NotificationRecord | undefined {
    return [...rows.values()].find((row) => row.idempotencyKey === key);
  }

  return {
    async findByIdempotencyKey(key) {
      const row = byKey(key);
      return row ? { ...row, attempts: [...row.attempts] } : null;
    },
    async save(notification: NotificationWrite) {
      const previous = rows.get(notification.id);
      const next: NotificationRecord = {
        ...notification,
        attempts: previous?.attempts ?? [],
      };
      rows.set(next.id, next);
      return { ...next, attempts: [...next.attempts] };
    },
    async appendAttempt(attempt: NotificationAttempt) {
      const row = rows.get(attempt.notificationId);
      if (row) {
        row.attempts = [...row.attempts, attempt];
      }
      return attempt;
    },
    async listByEntity(entityType, entityId) {
      return [...rows.values()]
        .filter((row) => row.entityType === entityType && row.entityId === entityId)
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
        .map((row) => ({ ...row, attempts: [...row.attempts] }));
    },
  };
}
