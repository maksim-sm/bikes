import type { Metadata } from "next";
import { getCartServices } from "@/app/api/_lib/compose";
import { formatPrice, t } from "@/lib/i18n";
import { ButtonLink, Container, Stack } from "@/ui";
import { readCartActor } from "../_lib/cart-actor";
import type { CartView } from "@/modules/cart";
import { createPricingServices } from "@/modules/pricing";
import { CartEditor } from "./cart-editor";
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
  const actor = await readCartActor();
  const view: CartView = actor
    ? await (await getCartServices()).getCartView(actor)
    : {
        id: "",
        items: [],
        subtotalMinor: 0,
        currency: createPricingServices().currency(),
      };

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
          {view.items.length === 0 ? (
            <Stack space={4}>
              <p>{t.cart.empty}</p>
              <div>
                <ButtonLink href="/catalog" variant="secondary">
                  {t.cart.continueShopping}
                </ButtonLink>
              </div>
            </Stack>
          ) : (
            <Stack space={5}>
              <CartEditor items={view.items} />
              <p className={styles.subtotal}>
                {t.cart.subtotal}: {formatPrice(view.subtotalMinor)}
              </p>
              {view.items.every((line) => line.purchasable) ? (
                <div>
                  <ButtonLink href="/checkout">{t.actions.checkout}</ButtonLink>
                </div>
              ) : (
                <p className={styles.error} role="status">
                  {t.cart.checkoutBlocked}
                </p>
              )}
              <div>
                <ButtonLink href="/catalog" variant="secondary">
                  {t.cart.continueShopping}
                </ButtonLink>
              </div>
            </Stack>
          )}
        </Stack>
      </div>
    </Container>
  );
}
