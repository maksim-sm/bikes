"use server";

import { getAuthServices } from "@/app/api/_lib/compose";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { STAFF_ROLES } from "@/modules/identity";
import { recordAdminAudit } from "../../_lib/audit";
import { requireAdminTitle } from "../../_lib/staff";

export type StaffFormState = { ok: boolean; message: string } | null;

export async function setStaffRolesAction(
  _previous: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  const principal = await requireAdminTitle();
  const userId = String(formData.get("userId") ?? "").trim();
  const roles = STAFF_ROLES.filter((role) => formData.get(`role-${role}`) === "on");
  if (!userId) {
    return { ok: false, message: t.admin.staffFailed };
  }
  try {
    const changed = await (
      await getAuthServices()
    ).setStaffRoles(principal, userId, roles);
    await recordAdminAudit(principal, {
      action: "identity.roles.update",
      entityType: "user",
      entityId: changed.userId,
      before: { roles: changed.before },
      after: { roles: changed.after },
    });
    return { ok: true, message: t.admin.staffSaved };
  } catch (error) {
    if (isAppError(error) && error.code === "conflict") {
      return { ok: false, message: t.admin.staffSelfDemote };
    }
    return { ok: false, message: t.admin.staffFailed };
  }
}
