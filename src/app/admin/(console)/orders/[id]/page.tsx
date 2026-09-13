import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { paymentMethodLabel } from "@/app/(storefront)/checkout/payment-label";
import {
  getDeliveryServices,
  getOrderServices,
  getPaymentServices,
} from "@/app/api/_lib/compose";
import { isAppError } from "@/lib/errors";
import { formatPrice, formatStoreDateTime, t } from "@/lib/i18n";
import type { PaymentStatus } from "@/modules/payments";
import { Card, TextLink } from "@/ui";
import { minorToBynInput } from "../../../_lib/money";
import {
  fulfillmentStatusLabel,
  orderStatusLabel,
  paymentStatusLabel,
  shipmentStatusLabel,
} from "../../../_lib/order-status";
import { requireAdminOrderManagement } from "../../../_lib/staff";
import styles from "../../../admin.module.css";
import {
  AssignShipmentForm,
  MarkDeliveredForm,
  MarkShippedForm,
  UpdateTrackingForm,
} from "../../deliveries/delivery-forms";
import {
  CancelOrderForm,
  CompleteOrderForm,
  RefundPaymentForm,
  StaffNotesForm,
} from "../order-forms";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: t.admin.orders,
};

function canInitiateRefund(status: PaymentStatus): boolean {
  return status === "SUCCEEDED" || status === "PARTIALLY_REFUNDED";
}

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const principal = await requireAdminOrderManagement();
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
  const [shipment, payments, methods] = await Promise.all([
    getDeliveryServices().getShipmentForOrder(principal, order),
    getPaymentServices().listPaymentsForOrder(principal, order.id),
    getDeliveryServices().listMethods(principal),
  ]);
  const open = order.status === "PLACED";

  return (
    <div className={styles.page}>
      <p>
        <TextLink href="/admin/orders">{t.admin.backToOrders}</TextLink>
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

      <section className={styles.section}>
        <h2>{t.admin.customerContact}</h2>
        <table className={styles.table}>
          <tbody>
            <tr>
              <th>{t.fields.name}</th>
              <td>{order.customerName}</td>
            </tr>
            <tr>
              <th>{t.fields.email}</th>
              <td>{order.customerEmail}</td>
            </tr>
            <tr>
              <th>{t.fields.phone}</th>
              <td>{order.customerPhone}</td>
            </tr>
            <tr>
              <th>{t.fields.recipient}</th>
              <td>
                {order.shipping.recipientName}, {order.shipping.phone}
              </td>
            </tr>
            <tr>
              <th>{t.fields.address}</th>
              <td>
                {order.shipping.street}, {order.shipping.city}, {order.shipping.region},{" "}
                {order.shipping.postalCode}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className={styles.section}>
        <Card filled>
          <ul>
            {order.items.map((item) => (
              <li key={`${item.sku}-${item.variantId}`}>
                {item.brandName} {item.productName} ({item.sku}) × {item.quantity} —{" "}
                {formatPrice(item.lineTotalMinor)}
              </li>
            ))}
          </ul>
          <p>
            {t.checkout.subtotal}: {formatPrice(order.subtotalMinor)}
          </p>
          <p>
            {t.checkout.delivery}: {formatPrice(order.deliveryCostMinor)}
          </p>
          <p>
            {t.checkout.total}: {formatPrice(order.totalMinor)}
          </p>
        </Card>
      </section>

      <section className={styles.section}>
        <h2>{t.admin.paymentsTitle}</h2>
        {payments.length === 0 ? (
          <p className={styles.hint}>{t.admin.noPayments}</p>
        ) : (
          payments.map((payment) => (
            <div key={payment.id}>
              <table className={styles.table}>
                <tbody>
                  <tr>
                    <th>{t.admin.paymentAttempt}</th>
                    <td>{payment.id}</td>
                  </tr>
                  <tr>
                    <th>{t.account.paymentStatus}</th>
                    <td>{paymentStatusLabel(payment.status)}</td>
                  </tr>
                  <tr>
                    <th>{t.checkout.total}</th>
                    <td>{formatPrice(payment.amountMinor)}</td>
                  </tr>
                </tbody>
              </table>
              {canInitiateRefund(payment.status) ? (
                <RefundPaymentForm
                  paymentId={payment.id}
                  defaultAmount={minorToBynInput(payment.amountMinor)}
                />
              ) : (
                <p className={styles.hint}>{t.admin.refundNotPermitted}</p>
              )}
            </div>
          ))
        )}
      </section>

      <StaffNotesForm orderId={order.id} notes={order.staffNotes ?? ""} />

      {open ? (
        <>
          <CompleteOrderForm orderId={order.id} />
          <CancelOrderForm orderId={order.id} />
        </>
      ) : null}

      <section className={styles.section}>
        <h2>{t.admin.deliveries}</h2>
        <p>
          <TextLink href={`/admin/deliveries?orderId=${order.id}`}>
            {t.admin.lookupTitle}
          </TextLink>
        </p>
        {shipment ? (
          <>
            <table className={styles.table}>
              <tbody>
                <tr>
                  <th>{t.admin.shipmentStatus}</th>
                  <td>{shipmentStatusLabel(shipment.status)}</td>
                </tr>
                <tr>
                  <th>{t.admin.carrierName}</th>
                  <td>{shipment.carrierName ?? t.admin.noTime}</td>
                </tr>
                <tr>
                  <th>{t.admin.trackingNumber}</th>
                  <td>{shipment.trackingNumber ?? t.admin.noTime}</td>
                </tr>
                <tr>
                  <th>{t.admin.trackingUrl}</th>
                  <td>
                    {shipment.trackingUrl ? (
                      <TextLink href={shipment.trackingUrl}>
                        {shipment.trackingUrl}
                      </TextLink>
                    ) : (
                      t.admin.noTime
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
                <tr>
                  <th>{t.admin.deliveryNotes}</th>
                  <td>{shipment.notes ?? t.admin.noTime}</td>
                </tr>
              </tbody>
            </table>
            <UpdateTrackingForm
              values={{
                orderId: shipment.orderId,
                carrierName: shipment.carrierName ?? "",
                trackingNumber: shipment.trackingNumber ?? "",
                trackingUrl: shipment.trackingUrl ?? "",
                shippedAt: shipment.shippedAt,
                deliveredAt: shipment.deliveredAt,
                notes: shipment.notes ?? "",
              }}
            />
            {shipment.status === "ASSIGNED" ? (
              <MarkShippedForm orderId={order.id} />
            ) : null}
            {shipment.status === "SHIPPED" ? (
              <MarkDeliveredForm orderId={order.id} />
            ) : null}
          </>
        ) : (
          <AssignShipmentForm
            orderId={order.id}
            methods={methods.map((method) => ({ code: method.code, name: method.name }))}
          />
        )}
      </section>
    </div>
  );
}
