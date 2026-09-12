import type { Metadata } from "next";
import { t } from "@/lib/i18n";
import { Stack } from "@/ui";
import { requireAdminInventory } from "../../_lib/staff";
import styles from "../../admin.module.css";

export const metadata: Metadata = {
  title: t.admin.inventory,
};

export default async function AdminInventoryPage() {
  await requireAdminInventory();

  return (
    <Stack space={4}>
      <h1>{t.admin.inventory}</h1>
      <p className={styles.hint}>{t.admin.inventoryLead}</p>
    </Stack>
  );
}
