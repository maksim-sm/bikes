import type { Metadata } from "next";
import { getCatalogServices } from "@/app/api/_lib/compose";
import { JsonLd } from "@/app/_lib/seo/json-ld";
import { publicPageMetadata } from "@/app/_lib/seo/metadata";
import { websiteJsonLd } from "@/app/_lib/seo/schema";
import { t } from "@/lib/i18n";
import { ButtonLink, Container, Stack } from "@/ui";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = publicPageMetadata({
  title: t.site.name,
  description: t.site.description,
  path: "/",
});

export default async function HomePage() {
  const catalog = await getCatalogServices();
  const featured = await catalog.getProductBySlug("emonda").catch(() => null);

  return (
    <Container>
      <div className={styles.page}>
        <JsonLd data={websiteJsonLd()} />
        <Stack space={5} as="section">
          <h1>{t.site.name}</h1>
          <p className={styles.lead}>
            {t.site.tagline}
            {featured
              ? `. ${t.product.featured}: ${featured.brandName} ${featured.name}.`
              : null}
          </p>
          {featured ? (
            <p>
              <ButtonLink href={`/products/${featured.slug}`}>
                {t.catalog.openProduct}
              </ButtonLink>
            </p>
          ) : null}
          <p>
            <ButtonLink href="/catalog" variant="secondary">
              {t.nav.catalog}
            </ButtonLink>
          </p>
        </Stack>
      </div>
    </Container>
  );
}
