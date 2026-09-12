import type { Metadata } from "next";
import { t } from "@/lib/i18n";
import { Container, Stack } from "@/ui";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: t.legal.termsTitle,
};

export default function TermsPage() {
  return (
    <div className={styles.page}>
      <Container prose>
        <Stack space={5}>
          <h1>{t.legal.termsTitle}</h1>
          <p>{t.legal.termsLead}</p>
          <p>{t.legal.termsBody}</p>
        </Stack>
      </Container>
    </div>
  );
}
