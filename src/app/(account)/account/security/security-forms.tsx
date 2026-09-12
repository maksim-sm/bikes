"use client";

import { useActionState } from "react";
import { t } from "@/lib/i18n";
import { Button, TextField } from "@/ui";
import styles from "../../account.module.css";
import { changePasswordAction, logoutAllAction, type AccountFormState } from "../actions";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<AccountFormState, FormData>(
    changePasswordAction,
    null,
  );

  return (
    <form action={action} className={styles.form}>
      <h2>{t.account.changePassword}</h2>
      <TextField
        name="currentPassword"
        type="password"
        label={t.fields.currentPassword}
        required
        autoComplete="current-password"
      />
      <TextField
        name="password"
        type="password"
        label={t.fields.newPassword}
        required
        autoComplete="new-password"
        hint={t.account.passwordPolicy}
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

export function LogoutAllForm() {
  const [state, action, pending] = useActionState<AccountFormState, FormData>(
    logoutAllAction,
    null,
  );

  return (
    <form action={action} className={styles.form}>
      <h2>{t.account.logoutAll}</h2>
      <Button type="submit" variant="danger" disabled={pending}>
        {t.account.logoutAll}
      </Button>
      {state ? (
        <p className={styles.error} role="status">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
