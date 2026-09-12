import type { Metadata } from "next";
import { getCatalogServices, getCartServices } from "@/app/api/_lib/compose";
import { formatPrice, t } from "@/lib/i18n";
import { ButtonLink, Container, Stack } from "@/ui";
import { getOrCreateGuestActor } from "../_lib/guest-cart";
import styles from "./cart.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: t.cart.title,
};

interface PageProps {
  searchParams: Promise<{ added?: string }>;
}

export default async function CartPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const actor = await getOrCreateGuestActor();
  const cart = await getCartServices().getCart(actor);
  const catalog = await getCatalogServices();
  const { items: products } = await catalog.listPublishedProducts({
    page: 1,
    pageSize: 50,
    sort: { field: "name", direction: "asc" },
    filters: {},
  });

  const lines = cart.items.map((line) => {
    const product = products.find((item) =>
      item.variants.some((variant) => variant.id === line.variantId),
    );
    const variant = product?.variants.find((item) => item.id === line.variantId);
    return { line, product, variant };
  });

  return (
    <Container>
      <div className={styles.page}>
        <Stack space={5}>
          <h1>{t.cart.title}</h1>
          {params.added === "1" ? (
            <p className={styles.success} role="status">
              {t.cart.added}
            </p>
          ) : null}
          {lines.length === 0 ? (
            <Stack space={4}>
              <p>{t.cart.empty}</p>
              <div>
                <ButtonLink href="/catalog" variant="secondary">
                  {t.cart.continueShopping}
                </ButtonLink>
              </div>
            </Stack>
          ) : (
            <ul className={styles.list}>
              {lines.map(({ line, product, variant }) => (
                <li key={line.variantId} className={styles.line}>
                  <p>
                    {product?.brandName} {product?.name}
                  </p>
                  {variant ? (
                    <p>
                      {t.product.frameSize}: {variant.frameSize}, {t.product.color}:{" "}
                      {variant.color}
                    </p>
                  ) : null}
                  <p>
                    {t.cart.quantity}: {line.quantity}
                    {variant
                      ? ` · ${formatPrice(variant.listPriceMinor * line.quantity)}`
                      : null}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Stack>
      </div>
    </Container>
  );
}
