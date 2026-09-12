import { currentPrincipal } from "@/app/_lib/session";
import { t } from "@/lib/i18n";
import { Container, TextLink } from "@/ui";
import styles from "./site-header.module.css";

export async function SiteHeader() {
  const principal = await currentPrincipal();
  const accountHref =
    principal.type === "customer"
      ? "/account"
      : principal.type === "staff"
        ? "/admin"
        : "/login";

  return (
    <header className={styles.header}>
      <Container>
        <div className={styles.inner}>
          <TextLink className={styles.brand} href="/" subtle>
            {t.site.name}
          </TextLink>

          <nav aria-label={t.nav.main} className={styles.nav}>
            <TextLink className={styles.navLink} href="/catalog" subtle>
              {t.nav.catalog}
            </TextLink>
            <span className={styles.navLink}>{t.nav.delivery}</span>
            <span className={styles.navLink}>{t.nav.contacts}</span>
          </nav>

          <div className={styles.tools}>
            <TextLink className={styles.cart} href={accountHref} subtle>
              {t.nav.account}
            </TextLink>
            <TextLink className={styles.cart} href="/cart" subtle>
              {t.nav.cart}
            </TextLink>
          </div>
        </div>
      </Container>
    </header>
  );
}
