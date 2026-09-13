import type { Metadata } from "next";
import { getAuthServices } from "@/app/api/_lib/compose";
import { notificationCopy, t } from "@/lib/i18n";
import { ButtonLink, Container, Stack } from "@/ui";
import styles from "../account.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: t.account.verifyTitle,
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const token = (await searchParams).token?.trim() ?? "";
  let ok = false;
  if (token.length > 0) {
    try {
      await (
        await getAuthServices()
      ).verifyEmail({
        rawToken: token,
        requestId: "account-verify",
      });
      ok = true;
    } catch {
      ok = false;
    }
  }

  return (
    <Container>
      <div className={styles.page}>
        <Stack space={5}>
          <h1>{t.account.verifyTitle}</h1>
          <p className={ok ? styles.success : styles.error} role="status">
            {token.length === 0 || !ok
              ? t.account.verifyFailed
              : notificationCopy("email.verified").body}
          </p>
          <div>
            <ButtonLink href="/login" variant="primary">
              {t.account.loginTitle}
            </ButtonLink>
          </div>
        </Stack>
      </div>
    </Container>
  );
}
