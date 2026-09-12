import type { Metadata } from "next";
import {
  getAuthServices,
  getCustomerServices,
  getOrderServices,
} from "@/app/api/_lib/compose";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { ButtonLink, Card, Stack } from "@/ui";
import { requireAccountCustomer } from "../_lib/guard";
import styles from "../account.module.css";

export const metadata: Metadata = {
  title: t.account.title,
};

export default async function AccountHomePage() {
  const principal = await requireAccountCustomer();
  const account = await (await getAuthServices()).getAccount(principal);
  let name = account.email;
  try {
    const profile = await getCustomerServices().getProfile(principal, principal.userId);
    const full = `${profile.firstName} ${profile.lastName}`.trim();
    if (full.length > 0) {
      name = full;
    }
  } catch (error) {
    if (!isAppError(error) || error.code !== "not_found") {
      throw error;
    }
  }
  const orders = await (await getOrderServices()).listOrders(principal);

  return (
    <Stack space={5}>
      <h1>{t.account.title}</h1>
      <p>
        {t.account.welcome}, {name}.
      </p>
      <p className={styles.hint}>{t.account.overviewLead}</p>
      <Card filled>
        <p>
          {t.account.orders}: {orders.length}
        </p>
      </Card>
      <div className={styles.actions}>
        <ButtonLink href="/account/orders" variant="primary">
          {t.account.orders}
        </ButtonLink>
        <ButtonLink href="/account/profile" variant="secondary">
          {t.account.profile}
        </ButtonLink>
        <ButtonLink href="/account/wishlist" variant="secondary">
          {t.account.wishlist}
        </ButtonLink>
      </div>
    </Stack>
  );
}
