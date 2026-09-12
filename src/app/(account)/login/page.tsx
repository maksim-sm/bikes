"use client";

import { useActionState } from "react";
import { t } from "@/lib/i18n";
import { Button, Container, Stack, TextField, TextLink } from "@/ui";
import styles from "../account.module.css";
import { customerLoginAction, demoCustomerLoginAction, type LoginState } from "./actions";

export default function CustomerLoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    customerLoginAction,
    null,
  );
  const [demoState, demoAction, demoPending] = useActionState<LoginState, FormData>(
    async () => demoCustomerLoginAction(),
    null,
  );
  const message = state?.message ?? demoState?.message;

  return (
    <Container>
      <div className={styles.page}>
        <Stack space={5}>
          <h1>{t.account.loginTitle}</h1>
          <p className={styles.hint}>{t.account.loginLead}</p>
          <form action={formAction} className={styles.form}>
            <TextField
              name="email"
              type="email"
              label={t.fields.email}
              required
              autoComplete="username"
            />
            <TextField
              name="password"
              type="password"
              label={t.fields.password}
              required
              autoComplete="current-password"
            />
            <Button type="submit" variant="primary" disabled={pending}>
              {t.account.loginSubmit}
            </Button>
          </form>
          {process.env.NODE_ENV !== "production" ? (
            <form action={demoAction}>
              <Button type="submit" disabled={demoPending}>
                {t.account.demoSignIn}
              </Button>
            </form>
          ) : null}
          <p>
            <TextLink href="/register">{t.account.toRegister}</TextLink>
          </p>
          {message ? (
            <p className={styles.error} role="alert">
              {message}
            </p>
          ) : null}
        </Stack>
      </div>
    </Container>
  );
}
