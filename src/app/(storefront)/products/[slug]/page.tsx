import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isAppError } from "@/lib/errors";
import { formatPrice, t } from "@/lib/i18n";
import { Container, Stack } from "@/ui";
import { loadProductPage } from "../../_lib/load-product-page";
import { MediaImage } from "../../_lib/media-image";
import { ProductPurchase } from "./product-purchase";
import styles from "./product-detail.module.css";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function productOrNotFound(slug: string) {
  try {
    return await loadProductPage(slug);
  } catch (error) {
    if (isAppError(error) && error.code === "not_found") {
      notFound();
    }
    throw error;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await loadProductPage(slug);
    return { title: `${product.brandName} ${product.name}` };
  } catch {
    return { title: t.status.notFound };
  }
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await productOrNotFound(slug);
  const typeLabel = t.bicycleType[product.bicycleType];
  const lowest = product.variants.reduce(
    (min, variant) => Math.min(min, variant.listPriceMinor),
    product.variants[0]?.listPriceMinor ?? 0,
  );

  return (
    <Container>
      <article className={styles.page}>
        <div className={styles.layout}>
          <div className={styles.gallery} aria-label={t.product.gallery}>
            {product.images[0] ? (
              <figure className={styles.hero}>
                <MediaImage src={product.images[0].src} alt={product.images[0].alt} />
              </figure>
            ) : null}
            {product.images.length > 1 ? (
              <div className={styles.thumbs}>
                {product.images.slice(1).map((image) => (
                  <MediaImage key={image.src} src={image.src} alt={image.alt} />
                ))}
              </div>
            ) : null}
          </div>

          <Stack space={5}>
            <p className={styles.brand}>{product.brandName}</p>
            <h1>{product.name}</h1>
            <p className={styles.lede}>{product.description}</p>
            <dl className={styles.facts}>
              <div>
                <dt>{t.product.model}</dt>
                <dd>{product.name}</dd>
              </div>
              {product.modelYear !== null ? (
                <div>
                  <dt>{t.product.year}</dt>
                  <dd>{product.modelYear}</dd>
                </div>
              ) : null}
              <div>
                <dt>{t.product.type}</dt>
                <dd>{typeLabel}</dd>
              </div>
              <div>
                <dt>{t.product.price}</dt>
                <dd>{formatPrice(lowest)}</dd>
              </div>
            </dl>

            <ProductPurchase variants={product.variants} />

            <section className={styles.section} aria-labelledby="specs-heading">
              <h2 id="specs-heading">{t.product.specifications}</h2>
              <table className={styles.specs}>
                <tbody>
                  <tr>
                    <th scope="row">{t.product.type}</th>
                    <td>{typeLabel}</td>
                  </tr>
                  {product.frameMaterial ? (
                    <tr>
                      <th scope="row">{t.product.frameMaterial}</th>
                      <td>{product.frameMaterial}</td>
                    </tr>
                  ) : null}
                  {product.groupset ? (
                    <tr>
                      <th scope="row">{t.product.groupset}</th>
                      <td>{product.groupset}</td>
                    </tr>
                  ) : null}
                  {product.brakeType ? (
                    <tr>
                      <th scope="row">{t.product.brakeType}</th>
                      <td>{product.brakeType}</td>
                    </tr>
                  ) : null}
                  <tr>
                    <th scope="row">{t.product.wheelSize}</th>
                    <td>
                      {[
                        ...new Set(product.variants.map((variant) => variant.wheelSize)),
                      ].join(", ")}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">{t.product.frameSize}</th>
                    <td>
                      {[
                        ...new Set(product.variants.map((variant) => variant.frameSize)),
                      ].join(", ")}
                    </td>
                  </tr>
                  <tr>
                    <th scope="row">{t.product.color}</th>
                    <td>
                      {[
                        ...new Set(product.variants.map((variant) => variant.color)),
                      ].join(", ")}
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>

            <section className={styles.section} aria-labelledby="warranty-heading">
              <h2 id="warranty-heading">{t.product.warranty}</h2>
              {product.warrantyMonths !== null ? (
                <p>
                  {product.warrantyMonths} {t.product.warrantyMonths}
                </p>
              ) : null}
              {product.warrantyText ? <p>{product.warrantyText}</p> : null}
            </section>

            <section className={styles.section} aria-labelledby="delivery-heading">
              <h2 id="delivery-heading">{t.product.delivery}</h2>
              <ul className={styles.quotes}>
                {product.quotes.map((quote) => (
                  <li key={quote.methodCode}>
                    {quote.methodName}: {formatPrice(quote.costMinor)},{" "}
                    {quote.estimatedText}
                  </li>
                ))}
              </ul>
            </section>
          </Stack>
        </div>
      </article>
    </Container>
  );
}
