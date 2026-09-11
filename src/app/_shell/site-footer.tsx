import { t } from "@/lib/i18n";
import { Cluster, Container } from "@/ui";
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
          <span>{t.site.tagline}</span>
        </Cluster>
      </Container>
    </footer>
  );
}
