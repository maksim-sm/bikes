import type { Metadata } from "next";
import { t } from "@/lib/i18n";
import { Container, Stack } from "@/ui";
import styles from "../legal.module.css";

export const metadata: Metadata = {
  title: t.legal.privacyTitle,
};

export default function PrivacyPage() {
  return (
    <div className={styles.page}>
      <Container prose>
        <Stack space={5}>
          <h1>{t.legal.privacyTitle}</h1>
          <p>{t.legal.privacyLead}</p>
          <p>{t.legal.privacyBody}</p>
        </Stack>
      </Container>
    </div>
  );
}
