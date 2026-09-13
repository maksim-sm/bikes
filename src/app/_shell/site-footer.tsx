import { t } from "@/lib/i18n";
import { Cluster, Container, TextLink } from "@/ui";
import styles from "./site-footer.module.css";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <Container>
        <Cluster justify="between" space={4}>
          <span className={styles.rights}>
            © {year} {t.site.name}. {t.footer.rights}.
          </span>
          <Cluster space={4}>
            <TextLink href="/delivery" subtle>
              {t.nav.delivery}
            </TextLink>
            <TextLink href="/contacts" subtle>
              {t.nav.contacts}
            </TextLink>
            <TextLink href="/legal/terms" subtle>
              {t.footer.terms}
            </TextLink>
            <TextLink href="/legal/privacy" subtle>
              {t.footer.privacy}
            </TextLink>
          </Cluster>
        </Cluster>
      </Container>
    </footer>
  );
}
