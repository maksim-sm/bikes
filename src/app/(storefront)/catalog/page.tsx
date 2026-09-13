import type { Metadata } from "next";
import { getCatalogServices } from "@/app/api/_lib/compose";
import { Breadcrumbs, storefrontCrumbs } from "@/app/_lib/seo/breadcrumbs";
import { JsonLd } from "@/app/_lib/seo/json-ld";
import { publicPageMetadata } from "@/app/_lib/seo/metadata";
import { catalogItemListJsonLd, imageAlt } from "@/app/_lib/seo/schema";
import { mediaSrc } from "@/modules/media";
import { lowestListPriceMinor } from "@/modules/catalog";
import { formatPrice, t } from "@/lib/i18n";
import {
  ButtonLink,
  Card,
  CardBody,
  CardFooter,
  CardTitle,
  Container,
  Grid,
  Stack,
  cardLinkOverlayClass,
} from "@/ui";
import { MediaImage } from "../_lib/media-image";
import styles from "./catalog.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = publicPageMetadata({
  title: t.catalog.title,
  description: t.catalog.description,
  path: "/catalog",
});

export default async function CatalogPage() {
  const catalog = await getCatalogServices();
  const { items } = await catalog.listPublishedProducts({
    page: 1,
    pageSize: 24,
    sort: { field: "publishedAt", direction: "desc" },
    filters: {},
  });

  return (
    <Container>
      <div className={styles.page}>
        <JsonLd data={catalogItemListJsonLd(items)} />
        <Stack space={5}>
          <Breadcrumbs
            items={storefrontCrumbs({ name: t.catalog.title, path: "/catalog" })}
          />
          <h1>{t.catalog.title}</h1>
          <p className={styles.lead}>{t.catalog.description}</p>
          {items.length === 0 ? (
            <p className={styles.lead}>{t.status.empty}</p>
          ) : (
            <Grid minColumnWidth="16rem" space={5} as="ul" className={styles.list}>
              {items.map((product) => {
                const price = lowestListPriceMinor(product);
                const image = [...product.images].sort(
                  (left, right) => left.sortOrder - right.sortOrder,
                )[0];
                return (
                  <li key={product.id}>
                    <Card interactive>
                      <CardBody>
                        <Stack space={3}>
                          {image ? (
                            <MediaImage
                              src={mediaSrc(image.key)}
                              alt={imageAlt({
                                alt: image.alt,
                                brandName: product.brandName,
                                name: product.name,
                              })}
                            />
                          ) : null}
                          <p>{product.brandName}</p>
                          <CardTitle as="h2">{product.name}</CardTitle>
                          {price !== null ? (
                            <p className={styles.price}>
                              {t.catalog.fromPrice} {formatPrice(price)}
                            </p>
                          ) : null}
                        </Stack>
                      </CardBody>
                      <CardFooter>
                        <ButtonLink
                          href={`/products/${product.slug}`}
                          variant="secondary"
                          className={cardLinkOverlayClass}
                        >
                          {t.catalog.openProduct}
                        </ButtonLink>
                      </CardFooter>
                    </Card>
                  </li>
                );
              })}
            </Grid>
          )}
        </Stack>
      </div>
    </Container>
  );
}
