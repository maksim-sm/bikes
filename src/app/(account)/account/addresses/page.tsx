import type { Metadata } from "next";
import { getCustomerServices } from "@/app/api/_lib/compose";
import { t } from "@/lib/i18n";
import { Card, Stack } from "@/ui";
import { requireAccountCustomer } from "../../_lib/guard";
import styles from "../../account.module.css";
import { AddAddressForm, SetDefaultForm } from "./address-forms";

export const metadata: Metadata = {
  title: t.account.addresses,
};

export default async function AccountAddressesPage() {
  const principal = await requireAccountCustomer();
  const addresses = await getCustomerServices().listAddresses(
    principal,
    principal.userId,
  );

  return (
    <Stack space={5}>
      <h1>{t.account.addresses}</h1>
      <p className={styles.hint}>{t.account.addressesLead}</p>
      {addresses.length === 0 ? (
        <p>{t.account.noAddresses}</p>
      ) : (
        <div className={styles.cardList}>
          {addresses.map((address) => (
            <Card key={address.id} filled>
              <p>
                <strong>{address.label}</strong>
                {address.isDefault ? ` — ${t.account.defaultAddress}` : null}
              </p>
              <p>{address.recipientName}</p>
              <p>{address.phone}</p>
              <p>
                {address.street}, {address.city}, {address.region}, {address.postalCode}
              </p>
              {address.isDefault ? null : <SetDefaultForm addressId={address.id} />}
            </Card>
          ))}
        </div>
      )}
      <AddAddressForm />
    </Stack>
  );
}
