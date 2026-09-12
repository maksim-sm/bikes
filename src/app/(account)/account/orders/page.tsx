import type { Metadata } from "next";
import { getOrderServices } from "@/app/api/_lib/compose";
import { formatPrice, t } from "@/lib/i18n";
import { TextLink } from "@/ui";
import { requireAccountCustomer } from "../../_lib/guard";
import {
  fulfillmentStatusLabel,
  orderStatusLabel,
  paymentStatusLabel,
} from "../../_lib/status";
import styles from "../../account.module.css";

export const metadata: Metadata = {
  title: t.account.orders,
};

export default async function AccountOrdersPage() {
  const principal = await requireAccountCustomer();
  const orders = await (await getOrderServices()).listOrders(principal);

  return (
    <div>
      <h1>{t.account.orders}</h1>
      <p className={styles.hint}>{t.account.ordersLead}</p>
      {orders.length === 0 ? (
        <p>{t.account.noOrders}</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t.account.orderNumber}</th>
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
                  <TextLink href={`/account/orders/${order.id}`}>{order.number}</TextLink>
                </td>
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
