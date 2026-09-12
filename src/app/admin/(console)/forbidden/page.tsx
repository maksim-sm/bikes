import type { Metadata } from "next";
import { t } from "@/lib/i18n";
import { Stack } from "@/ui";
import { requireAdminStaff } from "../../_lib/staff";
import styles from "../../admin.module.css";

export const metadata: Metadata = {
  title: t.admin.forbiddenTitle,
};

export default async function AdminForbiddenPage() {
  await requireAdminStaff();

  return (
    <Stack space={4}>
      <h1>{t.admin.forbiddenTitle}</h1>
      <p className={styles.hint}>{t.admin.forbiddenLead}</p>
    </Stack>
  );
}
