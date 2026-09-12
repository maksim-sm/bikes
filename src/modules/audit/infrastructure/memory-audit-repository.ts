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
  };
}
