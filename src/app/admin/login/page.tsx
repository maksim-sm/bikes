"use client";

import { useActionState } from "react";
import { t } from "@/lib/i18n";
import { Button, Container, Stack, TextField } from "@/ui";
import styles from "../admin.module.css";
import { demoStaffLoginAction, staffLoginAction, type LoginState } from "./actions";

export default function AdminLoginPage() {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(
    staffLoginAction,
    null,
  );
  const [demoState, demoAction, demoPending] = useActionState<LoginState, FormData>(
    async () => demoStaffLoginAction(),
    null,
  );
  const message = state?.message ?? demoState?.message;

  return (
    <Container>
      <div className={styles.page}>
        <Stack space={5}>
          <h1>{t.admin.loginTitle}</h1>
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
              {t.admin.loginSubmit}
            </Button>
          </form>
          {process.env.NODE_ENV !== "production" ? (
            <form action={demoAction}>
              <Button type="submit" disabled={demoPending}>
                {t.admin.demoSignIn}
              </Button>
            </form>
          ) : null}
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
