"use client";

import { useActionState } from "react";
import { t } from "@/lib/i18n";
import { Button, Container, Stack, TextField, TextLink } from "@/ui";
import styles from "../account.module.css";
import { customerRegisterAction, type RegisterState } from "./actions";

export default function CustomerRegisterPage() {
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(
    customerRegisterAction,
    null,
  );

  return (
    <Container>
      <div className={styles.page}>
        <Stack space={5}>
          <h1>{t.account.registerTitle}</h1>
          <p className={styles.hint}>{t.account.registerLead}</p>
          <form action={formAction} className={styles.form}>
            <TextField
              name="email"
              type="email"
              label={t.fields.email}
              required
              autoComplete="email"
            />
            <TextField
              name="password"
              type="password"
              label={t.fields.password}
              required
              autoComplete="new-password"
              hint={t.account.passwordPolicy}
            />
            <Button type="submit" variant="primary" disabled={pending}>
              {t.account.registerSubmit}
            </Button>
          </form>
          <p>
            <TextLink href="/login">{t.account.toLogin}</TextLink>
          </p>
          {state ? (
            <p className={state.ok ? styles.success : styles.error} role="status">
              {state.message}
            </p>
          ) : null}
        </Stack>
      </div>
    </Container>
  );
}
