import type { Metadata } from "next";
import { getCartServices } from "@/app/api/_lib/compose";
import { formatPrice, t } from "@/lib/i18n";
import { ButtonLink, Container, Stack } from "@/ui";
import { resolveCartActor } from "../_lib/cart-actor";
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
  const actor = await resolveCartActor();
  const view = await (await getCartServices()).getCartView(actor);

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
