import type { Metadata } from "next";
import { t } from "@/lib/i18n";
import { requireAdminTitle } from "../../_lib/staff";
import { loadOpsSnapshot } from "../../_lib/ops-snapshot";
import styles from "../../admin.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: t.admin.ops,
};

const inventoryLabel: Record<string, string> = {
  reserved_exceeds_on_hand: t.admin.opsInventoryReserved,
  negative_on_hand: t.admin.opsInventoryNegativeOnHand,
  negative_reserved: t.admin.opsInventoryNegativeReserved,
  stale_active_reservation: t.admin.opsInventoryStale,
};

const orderLabel: Record<string, string> = {
  succeeded_payment_on_cancelled_order: t.admin.opsOrderPaidCancelled,
  succeeded_payment_without_hold: t.admin.opsOrderPaidNoHold,
  shipped_without_success: t.admin.opsOrderShippedUnpaid,
};

export default async function AdminOpsPage() {
  const principal = await requireAdminTitle();
  const snapshot = await loadOpsSnapshot(principal);

  return (
    <div className={styles.page}>
      <h1>{t.admin.ops}</h1>
      <p className={styles.hint}>{t.admin.opsLead}</p>

      <h2>{t.admin.opsNotifications}</h2>
      {snapshot.notifications.length === 0 ? (
        <p className={styles.hint}>{t.admin.opsNotificationsEmpty}</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t.admin.opsEvent}</th>
              <th>{t.admin.opsEntity}</th>
              <th>{t.admin.opsError}</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.notifications.map((row) => (
              <tr key={row.id}>
                <td>{row.event}</td>
                <td>
                  {row.entityType} {row.entityId}
                </td>
                <td>{row.lastError ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>{t.admin.opsInventory}</h2>
      {snapshot.inventory.length === 0 ? (
        <p className={styles.hint}>{t.admin.opsInventoryEmpty}</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t.admin.opsCode}</th>
              <th>{t.admin.opsEntity}</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.inventory.map((row, index) => (
              <tr
                key={`${row.code}-${row.variantId ?? row.reservationId ?? String(index)}`}
              >
                <td>{inventoryLabel[row.code] ?? row.code}</td>
                <td>{row.variantId ?? row.reservationId ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2>{t.admin.opsOrders}</h2>
      {snapshot.orders.length === 0 ? (
        <p className={styles.hint}>{t.admin.opsOrdersEmpty}</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t.admin.opsCode}</th>
              <th>{t.admin.opsEntity}</th>
            </tr>
          </thead>
          <tbody>
            {snapshot.orders.map((row) => (
              <tr key={`${row.code}-${row.orderId}`}>
                <td>{orderLabel[row.code] ?? row.code}</td>
                <td>{row.orderNumber}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
