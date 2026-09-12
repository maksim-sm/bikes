import type { Metadata } from "next";
import { t } from "@/lib/i18n";
import { Stack } from "@/ui";
import { requireAccountCustomer } from "../../_lib/guard";
import styles from "../../account.module.css";
import { ChangePasswordForm, LogoutAllForm } from "./security-forms";

export const metadata: Metadata = {
  title: t.account.security,
};

export default async function AccountSecurityPage() {
  await requireAccountCustomer();

  return (
    <Stack space={5}>
      <h1>{t.account.security}</h1>
      <p className={styles.hint}>{t.account.changePasswordLead}</p>
      <ChangePasswordForm />
      <p className={styles.hint}>{t.account.logoutAllLead}</p>
      <LogoutAllForm />
    </Stack>
  );
}
