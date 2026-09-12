import type { AuditRecord } from "../domain/audit";
import type { AuditRepository } from "../application/ports";

export function createMemoryAuditRepository(
  seed: readonly AuditRecord[] = [],
): AuditRepository {
  const rows = [...seed];
  return {
    async append(record) {
      rows.push(record);
      return record;
    },
    async listByEntity(entityType, entityId) {
      return rows.filter(
        (row) => row.entityType === entityType && row.entityId === entityId,
      );
    },
    async listRecent(query) {
      return rows
        .filter((row) => {
          if (query.action && row.action !== query.action) {
            return false;
          }
          if (query.entityType && row.entityType !== query.entityType) {
            return false;
          }
          if (query.entityId && row.entityId !== query.entityId) {
            return false;
          }
          return true;
        })
        .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
        .slice(0, query.limit ?? 80);
    },
  };
}
