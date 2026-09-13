import type { Metadata } from "next";
import { Breadcrumbs, storefrontCrumbs } from "@/app/_lib/seo/breadcrumbs";
import { publicPageMetadata } from "@/app/_lib/seo/metadata";
import { t } from "@/lib/i18n";
import { Container, Stack } from "@/ui";
import styles from "../../legal/legal.module.css";

export const metadata: Metadata = publicPageMetadata({
  title: t.pages.contactsTitle,
  description: t.pages.contactsDescription,
  path: "/contacts",
});

export default function ContactsPage() {
  return (
    <div className={styles.page}>
      <Container prose>
        <Stack space={5} as="article">
          <Breadcrumbs
            items={storefrontCrumbs({
              name: t.pages.contactsTitle,
              path: "/contacts",
            })}
          />
          <h1>{t.pages.contactsTitle}</h1>
          <p>{t.pages.contactsLead}</p>
          <address>
            <p>{t.pages.contactsAddress}</p>
            <p>
              <a href={`tel:${t.pages.contactsPhone.replaceAll(" ", "")}`}>
                {t.pages.contactsPhone}
              </a>
            </p>
            <p>
              <a href={`mailto:${t.pages.contactsEmail}`}>{t.pages.contactsEmail}</a>
            </p>
          </address>
        </Stack>
      </Container>
    </div>
  );
}
