import type { Prisma } from "../../../generated/prisma/client";
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
      const data: Prisma.AuditLogUncheckedCreateInput = {
        id: record.id,
        actorUserId: record.actorUserId,
        requestId: record.requestId,
        action: record.action,
        entityType: record.entityType,
        entityId: record.entityId,
        createdAt: record.createdAt,
      };
      if (record.before !== null) {
        data.before = record.before as Prisma.InputJsonValue;
      }
      if (record.after !== null) {
        data.after = record.after as Prisma.InputJsonValue;
      }
      const row = await client.auditLog.create({ data });
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
