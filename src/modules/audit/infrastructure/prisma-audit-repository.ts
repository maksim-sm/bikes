import { Prisma } from "../../../generated/prisma/client";
import { prisma, type PrismaClient } from "@/lib/db";
import type { AuditRecord } from "../domain/audit";
import type { AuditRepository } from "../application/ports";

function toRecord(row: {
  id: string;
  actorUserId: string | null;
  requestId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before: unknown;
  after: unknown;
  createdAt: Date;
}): AuditRecord {
  return {
    id: row.id,
    actorUserId: row.actorUserId,
    requestId: row.requestId,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    before: row.before,
    after: row.after,
    createdAt: row.createdAt,
  };
}

export function createPrismaAuditRepository(
  client: PrismaClient = prisma,
): AuditRepository {
  return {
    async append(record) {
      const row = await client.auditLog.create({
        data: {
          id: record.id,
          actorUserId: record.actorUserId,
          requestId: record.requestId,
          action: record.action,
          entityType: record.entityType,
          entityId: record.entityId,
          before:
            record.before === null ? undefined : (record.before as Prisma.InputJsonValue),
          after:
            record.after === null ? undefined : (record.after as Prisma.InputJsonValue),
          createdAt: record.createdAt,
        },
      });
      return toRecord(row);
    },
    async listByEntity(entityType, entityId) {
      const rows = await client.auditLog.findMany({
        where: { entityType, entityId },
        orderBy: { createdAt: "asc" },
      });
      return rows.map(toRecord);
    },
  };
}
