import type { Metadata } from "next";
import {
  getAuthServices,
  getCatalogRepository,
  getInventoryServices,
} from "@/app/api/_lib/compose";
import { formatStoreDateTime, t } from "@/lib/i18n";
import { Button, TextField, TextLink } from "@/ui";
import { actorLabel, movementTypeLabel } from "../../_lib/inventory-copy";
import {
  labelForVariant,
  matchesStockQuery,
  variantStockLabels,
} from "../../_lib/inventory-catalog";
import { requireAdminInventory } from "../../_lib/staff";
import styles from "../../admin.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: t.admin.inventory,
};

export default async function AdminInventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const principal = await requireAdminInventory();
  const query = (await searchParams).q?.trim() ?? "";
  const [inventory, catalog, auth] = await Promise.all([
    getInventoryServices(),
    getCatalogRepository(),
    getAuthServices(),
  ]);
  const [stock, movements, products] = await Promise.all([
    inventory.listStock(principal),
    inventory.listRecentMovements(principal),
    catalog.listAll(),
  ]);
  const labels = variantStockLabels(products);
  const visible = stock.filter((row) =>
    matchesStockQuery(labelForVariant(labels, row.variantId), query),
  );
  const emails = new Map(
    (
      await auth.lookupEmails(
        principal,
        movements.flatMap((row) => (row.actorUserId ? [row.actorUserId] : [])),
      )
    ).map((row) => [row.userId, row.email]),
  );

  return (
    <div className={styles.page}>
      <h1>{t.admin.inventory}</h1>
      <p className={styles.hint}>{t.admin.inventoryLead}</p>
      <form method="get" className={styles.form}>
        <TextField
          name="q"
          label={t.admin.stockSearch}
          defaultValue={query}
          autoComplete="off"
        />
        <Button type="submit">{t.actions.search}</Button>
      </form>
      {visible.length === 0 ? (
        <p className={styles.hint}>{t.admin.inventoryEmpty}</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t.product.model}</th>
              <th>{t.product.sku}</th>
              <th>{t.product.frameSize}</th>
              <th>{t.product.color}</th>
              <th>{t.admin.onHand}</th>
              <th>{t.admin.reserved}</th>
              <th>{t.admin.available}</th>
              <th>{t.admin.openStock}</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => {
              const label = labelForVariant(labels, row.variantId);
              return (
                <tr key={row.variantId}>
                  <td>{label.productName}</td>
                  <td>{label.sku}</td>
                  <td>{label.frameSize || t.admin.noTime}</td>
                  <td>{label.color || t.admin.noTime}</td>
                  <td>{row.onHand}</td>
                  <td>{row.reserved}</td>
                  <td>{row.available}</td>
                  <td>
                    <TextLink href={`/admin/inventory/${row.variantId}`}>
                      {t.admin.openStock}
                    </TextLink>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <h2>{t.admin.recentMovements}</h2>
      {movements.length === 0 ? (
        <p className={styles.hint}>{t.admin.historyEmpty}</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t.admin.movementTime}</th>
              <th>{t.product.sku}</th>
              <th>{t.admin.movementType}</th>
              <th>{t.cart.quantity}</th>
              <th>{t.admin.onHandAfter}</th>
              <th>{t.admin.reservedAfter}</th>
              <th>{t.admin.reason}</th>
              <th>{t.admin.actor}</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((row) => {
              const label = labelForVariant(labels, row.variantId);
              return (
                <tr key={row.id}>
                  <td>{formatStoreDateTime(row.createdAt)}</td>
                  <td>
                    <TextLink href={`/admin/inventory/${row.variantId}`}>
                      {label.sku}
                    </TextLink>
                  </td>
                  <td>{movementTypeLabel(row.type)}</td>
                  <td>{row.quantity}</td>
                  <td>{row.onHandAfter}</td>
                  <td>{row.reservedAfter}</td>
                  <td>{row.note ?? t.admin.noTime}</td>
                  <td>{actorLabel(row.actorUserId, emails)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
