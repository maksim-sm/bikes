import { t } from "@/lib/i18n";
import { ButtonLink, Container, Stack } from "@/ui";
import styles from "./page.module.css";

export default function HomePage() {
  return (
    <Container>
      <div className={styles.page}>
        <Stack space={5}>
          <h1>{t.site.name}</h1>
          <p className={styles.lead}>
            {t.dev.underConstruction}. {t.dev.foundationOnly}
          </p>
          <div>
            <ButtonLink href="/ui-kit" variant="secondary">
              {t.dev.uiKit}
            </ButtonLink>
          </div>
        </Stack>
      </div>
    </Container>
  );
}
