import { t } from "@/lib/i18n";
import { Container, TextLink } from "@/ui";
import styles from "./site-header.module.css";

/**
 * Placeholder site header.
 *
 * Structure only: the links point at routes that do not exist yet, so they are
 * rendered as plain text rather than as links to nowhere. Cart and account
 * controls arrive with the modules that own them.
 */
export function SiteHeader() {
  return (
    <header className={styles.header}>
      <Container>
        <div className={styles.inner}>
          <TextLink className={styles.brand} href="/" subtle>
            {t.site.name}
          </TextLink>

          <nav aria-label={t.nav.main} className={styles.nav}>
            <span className={styles.navLink}>{t.nav.catalog}</span>
            <span className={styles.navLink}>{t.nav.delivery}</span>
            <span className={styles.navLink}>{t.nav.contacts}</span>
          </nav>
        </div>
      </Container>
    </header>
  );
}
