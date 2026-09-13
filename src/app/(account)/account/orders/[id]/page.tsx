import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDeliveryServices, getOrderServices } from "@/app/api/_lib/compose";
import { paymentMethodLabel } from "@/app/(storefront)/checkout/payment-label";
import { isAppError } from "@/lib/errors";
import { formatPrice, formatStoreDateTime, t } from "@/lib/i18n";
import { Card, Stack, TextLink } from "@/ui";
import { requireAccountCustomer } from "../../../_lib/guard";
import {
  fulfillmentStatusLabel,
  orderStatusLabel,
  paymentStatusLabel,
  shipmentStatusLabel,
} from "../../../_lib/status";
import styles from "../../../account.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: t.account.order,
};

export default async function AccountOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const principal = await requireAccountCustomer();
  const { id } = await params;
  let order;
  try {
    order = await (await getOrderServices()).getOrder(id, principal);
  } catch (error) {
    if (isAppError(error) && (error.code === "not_found" || error.code === "forbidden")) {
      notFound();
    }
    throw error;
  }
  const shipment = await getDeliveryServices().getShipmentForOrder(principal, order);

  return (
    <Stack space={5}>
      <p>
        <TextLink href="/account/orders">{t.account.backToOrders}</TextLink>
      </p>
      <h1>
        {t.account.order} {order.number}
      </h1>
      <table className={styles.table}>
        <tbody>
          <tr>
            <th>{t.account.orderStatus}</th>
            <td>{orderStatusLabel(order.status)}</td>
          </tr>
          <tr>
            <th>{t.account.paymentStatus}</th>
            <td>{paymentStatusLabel(order.paymentStatus)}</td>
          </tr>
          <tr>
            <th>{t.account.deliveryStatus}</th>
            <td>{fulfillmentStatusLabel(order.fulfillmentStatus)}</td>
          </tr>
          <tr>
            <th>{t.fields.deliveryMethod}</th>
            <td>{order.deliveryMethodName}</td>
          </tr>
          <tr>
            <th>{t.checkout.payment}</th>
            <td>{paymentMethodLabel(order.paymentMethodCode)}</td>
          </tr>
        </tbody>
      </table>
      <Card filled>
        <ul>
          {order.items.map((item) => (
            <li key={`${item.sku}-${item.variantId}`}>
              {item.brandName} {item.productName} × {item.quantity} —{" "}
              {formatPrice(item.lineTotalMinor)}
            </li>
          ))}
        </ul>
        <p className={styles.row}>
          <span>{t.checkout.subtotal}</span>
          <span>{formatPrice(order.subtotalMinor)}</span>
        </p>
        <p className={styles.row}>
          <span>{t.checkout.delivery}</span>
          <span>{formatPrice(order.deliveryCostMinor)}</span>
        </p>
        <p className={styles.total}>
          <span>{t.checkout.total}</span>
          <span>{formatPrice(order.totalMinor)}</span>
        </p>
      </Card>
      <p>
        {order.shipping.recipientName}, {order.shipping.street}, {order.shipping.city},{" "}
        {order.shipping.postalCode}
      </p>
      <section>
        <h2>{t.account.tracking}</h2>
        {shipment ? (
          <table className={styles.table}>
            <tbody>
              <tr>
                <th>{t.account.deliveryStatus}</th>
                <td>{shipmentStatusLabel(shipment.status)}</td>
              </tr>
              <tr>
                <th>{t.admin.carrierName}</th>
                <td>{shipment.carrierName ?? t.account.noTracking}</td>
              </tr>
              <tr>
                <th>{t.admin.trackingNumber}</th>
                <td>{shipment.trackingNumber ?? t.account.noTracking}</td>
              </tr>
              <tr>
                <th>{t.admin.trackingUrl}</th>
                <td>
                  {shipment.trackingUrl ? (
                    <TextLink href={shipment.trackingUrl}>
                      {shipment.trackingUrl}
                    </TextLink>
                  ) : (
                    t.account.noTracking
                  )}
                </td>
              </tr>
              <tr>
                <th>{t.admin.shippedAt}</th>
                <td>
                  {shipment.shippedAt
                    ? formatStoreDateTime(shipment.shippedAt)
                    : t.admin.noTime}
                </td>
              </tr>
              <tr>
                <th>{t.admin.deliveredAt}</th>
                <td>
                  {shipment.deliveredAt
                    ? formatStoreDateTime(shipment.deliveredAt)
                    : t.admin.noTime}
                </td>
              </tr>
            </tbody>
          </table>
        ) : (
          <p>{t.account.noShipment}</p>
        )}
      </section>
    </Stack>
  );
}
