import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrderServices } from "@/app/api/_lib/compose";
import { formatPrice, t } from "@/lib/i18n";
import { ButtonLink, Container, Stack } from "@/ui";
import styles from "../../checkout.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: t.checkout.confirmationTitle,
};

interface PageProps {
  params: Promise<{ orderId: string }>;
}

export default async function CheckoutConfirmationPage({ params }: PageProps) {
  const { orderId } = await params;
  let order;
  try {
    order = await (await getOrderServices()).getPlacedOrder(orderId);
  } catch {
    notFound();
  }

  return (
    <Container>
      <div className={styles.page}>
        <Stack space={5}>
          <h1>{t.checkout.confirmationTitle}</h1>
          <p>
            {t.checkout.confirmationLead} <strong>{order.number}</strong>
          </p>
          <ul className={styles.lines}>
            {order.items.map((item) => (
              <li key={`${item.sku}-${item.variantId}`}>
                {item.brandName} {item.productName} × {item.quantity} —{" "}
                {formatPrice(item.lineTotalMinor)}
              </li>
            ))}
          </ul>
          <p>
            {t.checkout.subtotal}: {formatPrice(order.subtotalMinor)}
          </p>
          <p>
            {t.checkout.delivery}: {order.deliveryMethodName} —{" "}
            {formatPrice(order.deliveryCostMinor)}
          </p>
          <p className={styles.total}>
            {t.checkout.total}: {formatPrice(order.totalMinor)}
          </p>
          <div>
            <ButtonLink href="/catalog" variant="secondary">
              {t.checkout.backToCatalog}
            </ButtonLink>
          </div>
        </Stack>
      </div>
    </Container>
  );
}
