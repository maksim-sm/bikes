import type { Metadata } from "next";
import { getDeliveryServices } from "@/app/api/_lib/compose";
import { formatPrice, t } from "@/lib/i18n";
import type { DeliveryKind } from "@/modules/delivery";
import { requireAdminOrderManagement } from "../../_lib/staff";
import styles from "../../admin.module.css";
import { AssignShipmentForm, MarkShippedForm } from "./delivery-forms";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: t.admin.deliveries,
};

function kindLabel(kind: DeliveryKind): string {
  if (kind === "pickup") {
    return t.delivery.kindPickup;
  }
  if (kind === "regional") {
    return t.delivery.kindRegional;
  }
  return t.delivery.kindCourier;
}

export default async function AdminDeliveriesPage() {
  const principal = await requireAdminOrderManagement();
  const methods = await getDeliveryServices().listMethods(principal);

  return (
    <div className={styles.page}>
      <h1>{t.admin.deliveries}</h1>
      <h2>{t.admin.methodsTitle}</h2>
      {methods.length === 0 ? (
        <p className={styles.hint}>{t.status.empty}</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>{t.admin.methodCode}</th>
              <th>{t.fields.deliveryMethod}</th>
              <th>{t.admin.methodKind}</th>
              <th>{t.admin.freeThreshold}</th>
            </tr>
          </thead>
          <tbody>
            {methods.map((method) => (
              <tr key={method.code}>
                <td>{method.code}</td>
                <td>{method.name}</td>
                <td>{kindLabel(method.kind)}</td>
                <td>
                  {method.freeThresholdMinor === null
                    ? t.admin.noThreshold
                    : formatPrice(method.freeThresholdMinor)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <AssignShipmentForm
        methods={methods.map((method) => ({ code: method.code, name: method.name }))}
      />
      <MarkShippedForm />
    </div>
  );
}
