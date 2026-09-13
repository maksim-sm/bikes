import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrderServices } from "@/app/api/_lib/compose";
import { formatPrice, notificationCopy, t } from "@/lib/i18n";
import { ButtonLink, Card, Container, Stack } from "@/ui";
import { paymentMethodLabel } from "../../payment-label";
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
          <p>{notificationCopy("order.placed", { number: order.number }).body}</p>
          <Card filled>
            <ul className={styles.lines}>
              {order.items.map((item) => (
                <li key={`${item.sku}-${item.variantId}`}>
                  <span>
                    {item.brandName} {item.productName} × {item.quantity}
                  </span>
                  <span>{formatPrice(item.lineTotalMinor)}</span>
                </li>
              ))}
            </ul>
            <p className={styles.row}>
              <span>{t.checkout.subtotal}</span>
              <span>{formatPrice(order.subtotalMinor)}</span>
            </p>
            <p className={styles.row}>
              <span>{t.checkout.delivery}</span>
              <span>
                {order.deliveryMethodName} — {formatPrice(order.deliveryCostMinor)}
              </span>
            </p>
            <p className={styles.row}>
              <span>{t.checkout.payment}</span>
              <span>{paymentMethodLabel(order.paymentMethodCode)}</span>
            </p>
            <p className={styles.total}>
              <span>{t.checkout.total}</span>
              <span>{formatPrice(order.totalMinor)}</span>
            </p>
          </Card>
          <p>
            {order.shipping.street}, {order.shipping.city}, {order.shipping.postalCode}
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
