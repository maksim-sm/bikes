import { t } from "@/lib/i18n";
import type { MovementType } from "@/modules/inventory";

export function movementTypeLabel(type: MovementType): string {
  switch (type) {
    case "RECEIPT":
      return t.admin.movementReceipt;
    case "ADJUSTMENT":
      return t.admin.movementAdjustment;
    case "RETURN":
      return t.admin.movementReturn;
    case "RESERVE":
      return t.admin.movementReserve;
    case "RELEASE":
      return t.admin.movementRelease;
    case "EXPIRE":
      return t.admin.movementExpire;
    case "COMMIT":
      return t.admin.movementCommit;
  }
}

export function actorLabel(
  actorUserId: string | null,
  emails: Map<string, string>,
): string {
  if (actorUserId === null) {
    return t.admin.inventoryActorSystem;
  }
  return emails.get(actorUserId) ?? actorUserId;
}
