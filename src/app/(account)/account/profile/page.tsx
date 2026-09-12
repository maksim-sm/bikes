import type { Metadata } from "next";
import { getAuthServices, getCustomerServices } from "@/app/api/_lib/compose";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { Stack } from "@/ui";
import { requireAccountCustomer } from "../../_lib/guard";
import styles from "../../account.module.css";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = {
  title: t.account.profile,
};

export default async function AccountProfilePage() {
  const principal = await requireAccountCustomer();
  const account = await (await getAuthServices()).getAccount(principal);
  let firstName = "";
  let lastName = "";
  let phone = "";
  try {
    const profile = await getCustomerServices().getProfile(principal, principal.userId);
    firstName = profile.firstName;
    lastName = profile.lastName;
    phone = profile.phone ?? "";
  } catch (error) {
    if (!isAppError(error) || error.code !== "not_found") {
      throw error;
    }
  }

  return (
    <Stack space={5}>
      <h1>{t.account.profile}</h1>
      <p className={styles.hint}>{t.account.profileLead}</p>
      <p>
        {t.fields.email}: {account.email} ({t.account.emailReadonly})
      </p>
      <ProfileForm firstName={firstName} lastName={lastName} phone={phone} />
    </Stack>
  );
}
