import type { Metadata } from "next";
import { getOrderServices } from "@/app/api/_lib/compose";
import { formatPrice, t } from "@/lib/i18n";
import { Button, SelectField, TextField, TextLink } from "@/ui";
import { parseAdminOrderQuery } from "../../_lib/order-query";
import {
  fulfillmentStatusLabel,
  orderStatusLabel,
  paymentStatusLabel,
} from "../../_lib/order-status";
import { requireAdminOrderManagement } from "../../_lib/staff";
import styles from "../../admin.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: t.admin.orders,
};

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    paymentStatus?: string;
    fulfillmentStatus?: string;
  }>;
}) {
  const principal = await requireAdminOrderManagement();
  const params = await searchParams;
  const query = parseAdminOrderQuery(params);
  const orders = await (await getOrderServices()).listStaffOrders(principal, query);

  return (
    <div className={styles.page}>
      <h1>{t.admin.orders}</h1>
      <p className={styles.hint}>{t.admin.ordersLead}</p>
      <form method="get" className={styles.filters}>
        <TextField
          name="q"
          label={t.admin.searchOrders}
          defaultValue={query.q ?? ""}
          autoComplete="off"
        />
        <SelectField
          name="status"
          label={t.account.orderStatus}
          defaultValue={query.status ?? ""}
        >
          <option value="">{t.admin.filterAll}</option>
          <option value="PLACED">{t.account.placed}</option>
          <option value="COMPLETED">{t.account.completed}</option>
          <option value="CANCELLED">{t.account.cancelled}</option>
        </SelectField>
        <SelectField
          name="paymentStatus"
          label={t.account.paymentStatus}
          defaultValue={query.paymentStatus ?? ""}
        >
          <option value="">{t.admin.filterAll}</option>
          <option value="PENDING">{t.account.paymentPending}</option>
          <option value="SUCCEEDED">{t.account.paymentSucceeded}</option>
          <option value="FAILED">{t.account.paymentFailed}</option>
          <option value="REFUNDED">{t.account.paymentRefunded}</option>
          <option value="PARTIALLY_REFUNDED">{t.account.paymentPartialRefund}</option>
        </SelectField>
        <SelectField
          name="fulfillmentStatus"
          label={t.account.deliveryStatus}
          defaultValue={query.fulfillmentStatus ?? ""}
        >
          <option value="">{t.admin.filterAll}</option>
          <option value="UNFULFILLED">{t.account.fulfillmentUnfulfilled}</option>
          <option value="ASSIGNED">{t.account.fulfillmentAssigned}</option>
          <option value="SHIPPED">{t.account.fulfillmentShipped}</option>
          <option value="DELIVERED">{t.account.fulfillmentDelivered}</option>
          <option value="CANCELLED">{t.account.fulfillmentCancelled}</option>
        </SelectField>
        <Button type="submit">{t.admin.applyFilters}</Button>
      </form>
      {orders.length === 0 ? (
        <p>{t.admin.ordersEmpty}</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t.account.orderNumber}</th>
              <th>{t.fields.name}</th>
              <th>{t.fields.email}</th>
              <th>{t.account.orderStatus}</th>
              <th>{t.account.paymentStatus}</th>
              <th>{t.account.deliveryStatus}</th>
              <th>{t.checkout.total}</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>
                  <TextLink href={`/admin/orders/${order.id}`}>{order.number}</TextLink>
                </td>
                <td>{order.customerName}</td>
                <td>{order.customerEmail}</td>
                <td>{orderStatusLabel(order.status)}</td>
                <td>{paymentStatusLabel(order.paymentStatus)}</td>
                <td>{fulfillmentStatusLabel(order.fulfillmentStatus)}</td>
                <td>{formatPrice(order.totalMinor)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
