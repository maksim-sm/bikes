import type { AuditRecord } from "../domain/audit";

export interface Clock {
  now(): Date;
}

export interface AuditListQuery {
  action?: string;
  entityType?: string;
  entityId?: string;
  limit?: number;
}

export interface AuditRepository {
  append(record: AuditRecord): Promise<AuditRecord>;
  listByEntity(entityType: string, entityId: string): Promise<AuditRecord[]>;
  listRecent(query: AuditListQuery): Promise<AuditRecord[]>;
}
