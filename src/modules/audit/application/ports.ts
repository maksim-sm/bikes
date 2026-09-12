import type { AuditRecord } from "../domain/audit";

export interface Clock {
  now(): Date;
}

export interface AuditRepository {
  append(record: AuditRecord): Promise<AuditRecord>;
  listByEntity(entityType: string, entityId: string): Promise<AuditRecord[]>;
}
