import type { Metadata } from "next";
import { Breadcrumbs, storefrontCrumbs } from "@/app/_lib/seo/breadcrumbs";
import { publicPageMetadata } from "@/app/_lib/seo/metadata";
import { t } from "@/lib/i18n";
import { Container, Stack } from "@/ui";
import styles from "../legal.module.css";

export const metadata: Metadata = publicPageMetadata({
  title: t.legal.privacyTitle,
  description: t.legal.privacyLead,
  path: "/legal/privacy",
});

export default function PrivacyPage() {
  return (
    <div className={styles.page}>
      <Container prose>
        <Stack space={5} as="article">
          <Breadcrumbs
            items={storefrontCrumbs({
              name: t.legal.privacyTitle,
              path: "/legal/privacy",
            })}
          />
          <h1>{t.legal.privacyTitle}</h1>
          <p>{t.legal.privacyLead}</p>
          <p>{t.legal.privacyBody}</p>
        </Stack>
      </Container>
    </div>
  );
}
