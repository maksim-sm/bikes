import type { Metadata } from "next";
import { noIndexRobots } from "@/app/_lib/seo/metadata";
import { t } from "@/lib/i18n";
import { ButtonLink, Container, Stack } from "@/ui";
import { StorefrontChrome } from "./_shell/storefront-chrome";
import styles from "./legal/legal.module.css";

export const metadata: Metadata = {
  title: t.meta.notFoundTitle,
  robots: noIndexRobots,
};

export default function NotFoundPage() {
  return (
    <StorefrontChrome>
      <Container>
        <div className={styles.page}>
          <Stack space={5}>
            <h1>{t.status.notFound}</h1>
            <p>
              <ButtonLink href="/catalog">{t.nav.catalog}</ButtonLink>
            </p>
          </Stack>
        </div>
      </Container>
    </StorefrontChrome>
  );
}
