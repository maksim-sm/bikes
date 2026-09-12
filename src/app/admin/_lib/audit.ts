import { getAuditServices } from "@/app/api/_lib/compose";
import type { AuditWrite } from "@/modules/audit";
import { actorUserId, type Principal } from "@/modules/identity";

export function adminAuditContext(principal: Principal, requestId = crypto.randomUUID()) {
  return { actorUserId: actorUserId(principal), requestId };
}

export async function recordAdminAudit(
  principal: Principal,
  write: AuditWrite,
  requestId?: string,
): Promise<void> {
  await getAuditServices().record(adminAuditContext(principal, requestId), write);
}
