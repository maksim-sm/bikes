import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAuthServices,
  getCatalogRepository,
  getInventoryServices,
} from "@/app/api/_lib/compose";
import { isAppError } from "@/lib/errors";
import { formatDateTime, t } from "@/lib/i18n";
import { TextLink } from "@/ui";
import { actorLabel, movementTypeLabel } from "../../../_lib/inventory-copy";
import { labelForVariant, variantStockLabels } from "../../../_lib/inventory-catalog";
import { requireAdminInventory } from "../../../_lib/staff";
import styles from "../../../admin.module.css";
import { AdjustStockForm, ReceiveStockForm, ReturnStockForm } from "../stock-forms";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: t.admin.inventory,
};

export default async function AdminInventoryVariantPage({
  params,
}: {
  params: Promise<{ variantId: string }>;
}) {
  const principal = await requireAdminInventory();
  const { variantId } = await params;
  const [inventory, catalog, auth] = await Promise.all([
    getInventoryServices(),
    getCatalogRepository(),
    getAuthServices(),
  ]);
  let stock;
  try {
    stock = await inventory.getStaffStock(principal, variantId);
  } catch (error) {
    if (isAppError(error) && error.code === "not_found") {
      notFound();
    }
    throw error;
  }
  const [movements, products] = await Promise.all([
    inventory.listStaffMovements(principal, variantId),
    catalog.listAll(),
  ]);
  const label = labelForVariant(variantStockLabels(products), variantId);
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
      <p>
        <TextLink href="/admin/inventory">{t.admin.backToInventory}</TextLink>
      </p>
      <h1>{label.productName}</h1>
      <p className={styles.hint}>
        {t.product.sku}: {label.sku}
        {label.frameSize ? ` · ${label.frameSize}` : ""}
        {label.color ? ` · ${label.color}` : ""}
      </p>
      <table className={styles.table}>
        <tbody>
          <tr>
            <th>{t.admin.onHand}</th>
            <td>{stock.onHand}</td>
          </tr>
          <tr>
            <th>{t.admin.reserved}</th>
            <td>{stock.reserved}</td>
          </tr>
          <tr>
            <th>{t.admin.available}</th>
            <td>{stock.available}</td>
          </tr>
        </tbody>
      </table>
      <div className={styles.stockForms}>
        <ReceiveStockForm variantId={variantId} />
        <AdjustStockForm variantId={variantId} />
        <ReturnStockForm variantId={variantId} />
      </div>
      <h2>{t.admin.movements}</h2>
      {movements.length === 0 ? (
        <p className={styles.hint}>{t.admin.historyEmpty}</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t.admin.movementTime}</th>
              <th>{t.admin.movementType}</th>
              <th>{t.cart.quantity}</th>
              <th>{t.admin.onHandAfter}</th>
              <th>{t.admin.reservedAfter}</th>
              <th>{t.admin.reason}</th>
              <th>{t.admin.actor}</th>
            </tr>
          </thead>
          <tbody>
            {[...movements].reverse().map((row) => (
              <tr key={row.id}>
                <td>{formatDateTime(row.createdAt)}</td>
                <td>{movementTypeLabel(row.type)}</td>
                <td>{row.quantity}</td>
                <td>{row.onHandAfter}</td>
                <td>{row.reservedAfter}</td>
                <td>{row.note ?? t.admin.noTime}</td>
                <td>{actorLabel(row.actorUserId, emails)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
