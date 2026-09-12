import type { Metadata } from "next";
import { getCartServices, getDeliveryServices } from "@/app/api/_lib/compose";
import { t } from "@/lib/i18n";
import { ButtonLink, Container, Stack } from "@/ui";
import { readCartActor } from "../_lib/cart-actor";
import { CheckoutForm } from "./checkout-form";
import styles from "./checkout.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: t.checkout.title,
};

const DEFAULT_REGION = "Минск";
const DEFAULT_CITY = "Минск";

export default async function CheckoutPage() {
  const actor = await readCartActor();
  const view = actor
    ? await (await getCartServices()).getCartView(actor)
    : { items: [], subtotalMinor: 0 };
  const ready = view.items.length > 0 && view.items.every((line) => line.purchasable);

  if (!ready) {
    return (
      <Container>
        <div className={styles.page}>
          <Stack space={5}>
            <h1>{t.checkout.title}</h1>
            <p>{t.checkout.empty}</p>
            <div>
              <ButtonLink href="/cart" variant="secondary">
                {t.checkout.goToCart}
              </ButtonLink>
            </div>
          </Stack>
        </div>
      </Container>
    );
  }

  const quotes = await getDeliveryServices().listQuotes(
    {
      region: DEFAULT_REGION,
      city: DEFAULT_CITY,
    },
    { subtotalMinor: view.subtotalMinor },
  );

  return (
    <Container>
      <div className={styles.page}>
        <Stack space={5}>
          <h1>{t.checkout.title}</h1>
          <CheckoutForm
            lines={view.items.map((line) => ({
              variantId: line.variantId,
              productName: line.productName ?? "",
              brandName: line.brandName ?? "",
              frameSize: line.frameSize,
              color: line.color,
              quantity: line.quantity,
              unitPriceMinor: line.unitPriceMinor,
              lineTotalMinor: line.lineTotalMinor,
            }))}
            subtotalMinor={view.subtotalMinor}
            initialQuotes={quotes}
            defaultRegion={DEFAULT_REGION}
            defaultCity={DEFAULT_CITY}
          />
        </Stack>
      </div>
    </Container>
  );
}
