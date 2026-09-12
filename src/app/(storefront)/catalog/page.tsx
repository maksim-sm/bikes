import type { Metadata } from "next";
import { getCatalogServices } from "@/app/api/_lib/compose";
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

export const metadata: Metadata = {
  title: t.catalog.title,
};

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
        <Stack space={5}>
          <h1>{t.catalog.title}</h1>
          {items.length === 0 ? (
            <p className={styles.lead}>{t.status.empty}</p>
          ) : (
            <Grid minColumnWidth="16rem" space={5}>
              {items.map((product) => {
                const price = lowestListPriceMinor(product);
                const image = [...product.images].sort(
                  (left, right) => left.sortOrder - right.sortOrder,
                )[0];
                return (
                  <Card key={product.id} interactive>
                    <CardBody>
                      <Stack space={3}>
                        {image ? (
                          <MediaImage src={mediaSrc(image.key)} alt={image.alt} />
                        ) : null}
                        <p>{product.brandName}</p>
                        <CardTitle>{product.name}</CardTitle>
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
                );
              })}
            </Grid>
          )}
        </Stack>
      </div>
    </Container>
  );
}
