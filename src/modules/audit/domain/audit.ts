export interface AuditContext {
  actorUserId: string | null;
  requestId: string;
}

export interface AuditRecord {
  id: string;
  actorUserId: string | null;
  requestId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before: unknown | null;
  after: unknown | null;
  createdAt: Date;
}

export interface AuditWrite {
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown | null;
  after?: unknown | null;
}

export function prepareAuditRecord(
  context: AuditContext,
  write: AuditWrite,
  id: string,
  createdAt: Date,
): AuditRecord {
  return {
    id,
    actorUserId: context.actorUserId,
    requestId: context.requestId,
    action: write.action,
    entityType: write.entityType,
    entityId: write.entityId,
    before: write.before ?? null,
    after: write.after ?? null,
    createdAt,
  };
}
