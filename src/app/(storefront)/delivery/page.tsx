import type { Metadata } from "next";
import { Breadcrumbs, storefrontCrumbs } from "@/app/_lib/seo/breadcrumbs";
import { publicPageMetadata } from "@/app/_lib/seo/metadata";
import { t } from "@/lib/i18n";
import { Container, Stack } from "@/ui";
import styles from "../../legal/legal.module.css";

export const metadata: Metadata = publicPageMetadata({
  title: t.pages.deliveryTitle,
  description: t.pages.deliveryDescription,
  path: "/delivery",
});

export default function DeliveryPage() {
  return (
    <div className={styles.page}>
      <Container prose>
        <Stack space={5} as="article">
          <Breadcrumbs
            items={storefrontCrumbs({
              name: t.pages.deliveryTitle,
              path: "/delivery",
            })}
          />
          <h1>{t.pages.deliveryTitle}</h1>
          <p>{t.pages.deliveryLead}</p>
          <section>
            <h2>{t.delivery.methodCourier}</h2>
            <p>{t.pages.deliveryCourier}</p>
          </section>
          <section>
            <h2>{t.delivery.methodPickup}</h2>
            <p>{t.pages.deliveryPickup}</p>
          </section>
          <section>
            <h2>{t.delivery.methodRegional}</h2>
            <p>{t.pages.deliveryRegional}</p>
          </section>
          <section>
            <h2>{t.checkout.payment}</h2>
            <p>{t.pages.deliveryPayment}</p>
          </section>
        </Stack>
      </Container>
    </div>
  );
}
