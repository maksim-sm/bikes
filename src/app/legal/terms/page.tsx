import type { Metadata } from "next";
import { Breadcrumbs, storefrontCrumbs } from "@/app/_lib/seo/breadcrumbs";
import { publicPageMetadata } from "@/app/_lib/seo/metadata";
import { t } from "@/lib/i18n";
import { Container, Stack } from "@/ui";
import styles from "../legal.module.css";

export const metadata: Metadata = publicPageMetadata({
  title: t.legal.termsTitle,
  description: t.legal.termsLead,
  path: "/legal/terms",
});

export default function TermsPage() {
  return (
    <div className={styles.page}>
      <Container prose>
        <Stack space={5} as="article">
          <Breadcrumbs
            items={storefrontCrumbs({ name: t.legal.termsTitle, path: "/legal/terms" })}
          />
          <h1>{t.legal.termsTitle}</h1>
          <p>{t.legal.termsLead}</p>
          <p>{t.legal.termsBody}</p>
        </Stack>
      </Container>
    </div>
  );
}
