import type { Metadata } from "next";
import { getAuthServices } from "@/app/api/_lib/compose";
import { t } from "@/lib/i18n";
import { requireAdminTitle } from "../../_lib/staff";
import styles from "../../admin.module.css";
import { StaffRolesForm } from "./staff-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: t.admin.staff,
};

export default async function AdminStaffPage() {
  const principal = await requireAdminTitle();
  const staff = await (await getAuthServices()).listStaff(principal);

  return (
    <div className={styles.page}>
      <h1>{t.admin.staff}</h1>
      <p className={styles.hint}>{t.admin.staffLead}</p>
      {staff.length === 0 ? (
        <p className={styles.hint}>{t.admin.staffEmpty}</p>
      ) : (
        staff.map((row) => (
          <section key={row.userId} className={styles.variant}>
            <h2>{row.email}</h2>
            <StaffRolesForm userId={row.userId} roles={row.roles} />
          </section>
        ))
      )}
    </div>
  );
}
