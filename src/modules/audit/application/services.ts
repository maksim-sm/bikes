import { prepareAuditRecord, type AuditContext, type AuditWrite } from "../domain/audit";
import type { AuditRepository, Clock } from "./ports";

export interface AuditServices {
  record(context: AuditContext, write: AuditWrite): Promise<void>;
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
  };
}
