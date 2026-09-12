"use client";

import { useActionState } from "react";
import { t } from "@/lib/i18n";
import { Button, TextField } from "@/ui";
import styles from "../../account.module.css";
import { updateProfileAction, type AccountFormState } from "../actions";

export function ProfileForm({
  firstName,
  lastName,
  phone,
}: {
  firstName: string;
  lastName: string;
  phone: string;
}) {
  const [state, action, pending] = useActionState<AccountFormState, FormData>(
    updateProfileAction,
    null,
  );

  return (
    <form action={action} className={styles.form}>
      <TextField
        name="firstName"
        label={t.fields.firstName}
        required
        defaultValue={firstName}
        autoComplete="given-name"
      />
      <TextField
        name="lastName"
        label={t.fields.lastName}
        required
        defaultValue={lastName}
        autoComplete="family-name"
      />
      <TextField
        name="phone"
        label={t.fields.phone}
        defaultValue={phone}
        optionalLabel={t.form.optional}
        autoComplete="tel"
      />
      <Button type="submit" variant="primary" disabled={pending}>
        {t.actions.save}
      </Button>
      {state ? (
        <p className={state.ok ? styles.success : styles.error} role="status">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
