"use client";

import { useActionState } from "react";
import { t } from "@/lib/i18n";
import { Button, Checkbox } from "@/ui";
import styles from "../../admin.module.css";
import { setStaffRolesAction, type StaffFormState } from "./actions";

const STAFF_ROLES = ["admin", "manager", "inventory", "order_management"] as const;

const ROLE_LABEL: Record<(typeof STAFF_ROLES)[number], string> = {
  admin: t.admin.roleAdmin,
  manager: t.admin.roleManager,
  inventory: t.admin.roleInventory,
  order_management: t.admin.roleOrders,
};

export function StaffRolesForm({
  userId,
  roles,
}: {
  userId: string;
  roles: readonly string[];
}) {
  const [state, action, pending] = useActionState<StaffFormState, FormData>(
    setStaffRolesAction,
    null,
  );

  return (
    <form action={action} className={styles.form}>
      <input type="hidden" name="userId" value={userId} />
      {STAFF_ROLES.map((role) => (
        <Checkbox
          key={role}
          name={`role-${role}`}
          label={ROLE_LABEL[role]}
          defaultChecked={roles.includes(role)}
        />
      ))}
      <Button type="submit" variant="primary" disabled={pending}>
        {t.admin.staffSubmit}
      </Button>
      {state ? (
        <p className={state.ok ? styles.success : styles.error} role="status">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
