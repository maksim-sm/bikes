"use client";

import { useActionState } from "react";
import { t } from "@/lib/i18n";
import { Button, Checkbox, TextField } from "@/ui";
import styles from "../../account.module.css";
import {
  addAddressAction,
  setDefaultAddressAction,
  type AccountFormState,
} from "../actions";

export function AddAddressForm() {
  const [state, action, pending] = useActionState<AccountFormState, FormData>(
    addAddressAction,
    null,
  );

  return (
    <form action={action} className={styles.form}>
      <h2>{t.account.addAddress}</h2>
      <TextField name="label" label={t.fields.addressLabel} required autoComplete="off" />
      <TextField
        name="recipientName"
        label={t.fields.recipient}
        required
        autoComplete="name"
      />
      <TextField name="phone" label={t.fields.phone} required autoComplete="tel" />
      <TextField
        name="region"
        label={t.fields.region}
        required
        autoComplete="address-level1"
      />
      <TextField
        name="city"
        label={t.fields.city}
        required
        autoComplete="address-level2"
      />
      <TextField
        name="street"
        label={t.fields.street}
        required
        autoComplete="street-address"
      />
      <TextField
        name="postalCode"
        label={t.fields.postalCode}
        required
        autoComplete="postal-code"
      />
      <Checkbox name="isDefault" value="on" label={t.account.defaultAddress} />
      <Button type="submit" variant="primary" disabled={pending}>
        {t.actions.add}
      </Button>
      {state ? (
        <p className={state.ok ? styles.success : styles.error} role="status">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

export function SetDefaultForm({ addressId }: { addressId: string }) {
  const [state, action, pending] = useActionState<AccountFormState, FormData>(
    setDefaultAddressAction,
    null,
  );

  return (
    <form action={action}>
      <input type="hidden" name="addressId" value={addressId} />
      <Button type="submit" variant="secondary" disabled={pending}>
        {t.account.setDefault}
      </Button>
      {state ? (
        <p className={state.ok ? styles.success : styles.error} role="status">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
