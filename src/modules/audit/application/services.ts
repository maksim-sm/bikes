import { requireAdmin, type Principal } from "@/modules/identity";
import {
  prepareAuditRecord,
  type AuditContext,
  type AuditRecord,
  type AuditWrite,
} from "../domain/audit";
import type { AuditListQuery, AuditRepository, Clock } from "./ports";

const DEFAULT_LIMIT = 80;

export interface AuditServices {
  record(context: AuditContext, write: AuditWrite): Promise<void>;
  listRecent(principal: Principal, query?: AuditListQuery): Promise<AuditRecord[]>;
}

export function createAuditServices(deps: {
  audit: AuditRepository;
  clock: Clock;
}): AuditServices {
  return {
    async record(context, write) {
      await deps.audit.append(
        prepareAuditRecord(context, write, crypto.randomUUID(), deps.clock.now()),
      );
    },

    async listRecent(principal, query = {}) {
      requireAdmin(principal);
      const limit =
        Number.isInteger(query.limit) && (query.limit ?? 0) > 0
          ? query.limit
          : DEFAULT_LIMIT;
      return deps.audit.listRecent({ ...query, limit });
    },
  };
}
