import { getCatalogServices } from "@/app/api/_lib/compose";
import { t } from "@/lib/i18n";
import { ButtonLink, Container, Stack } from "@/ui";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const catalog = await getCatalogServices();
  const featured = await catalog.getProductBySlug("emonda").catch(() => null);

  return (
    <Container>
      <div className={styles.page}>
        <Stack space={5}>
          <h1>{t.site.name}</h1>
          <p className={styles.lead}>
            {t.site.tagline}
            {featured
              ? `. ${t.product.featured}: ${featured.brandName} ${featured.name}.`
              : null}
          </p>
          {featured ? (
            <div>
              <ButtonLink href={`/products/${featured.slug}`}>
                {t.catalog.openProduct}
              </ButtonLink>
            </div>
          ) : null}
          <div>
            <ButtonLink href="/catalog" variant="secondary">
              {t.nav.catalog}
            </ButtonLink>
          </div>
        </Stack>
      </div>
    </Container>
  );
}
