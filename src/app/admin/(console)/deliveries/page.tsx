import type { Metadata } from "next";
import { getDeliveryServices } from "@/app/api/_lib/compose";
import { isAppError } from "@/lib/errors";
import { formatPrice, formatStoreDateTime, t } from "@/lib/i18n";
import type { DeliveryKind, ShipmentRecord } from "@/modules/delivery";
import { Button, TextField, TextLink } from "@/ui";
import { requireAdminOrderManagement } from "../../_lib/staff";
import styles from "../../admin.module.css";
import {
  AssignShipmentForm,
  CancelOrderForm,
  CompleteOrderForm,
  MarkDeliveredForm,
  MarkShippedForm,
  RefundPaymentForm,
  UpdateTrackingForm,
} from "./delivery-forms";

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

function statusLabel(status: ShipmentRecord["status"]): string {
  if (status === "SHIPPED") {
    return t.admin.shipmentShipped;
  }
  if (status === "DELIVERED") {
    return t.admin.shipmentDelivered;
  }
  if (status === "FAILED") {
    return t.admin.shipmentFailed;
  }
  return t.admin.shipmentAssigned;
}

export default async function AdminDeliveriesPage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string }>;
}) {
  const principal = await requireAdminOrderManagement();
  const methods = await getDeliveryServices().listMethods(principal);
  const orderId = (await searchParams).orderId?.trim() ?? "";
  let shipment: ShipmentRecord | null = null;
  let lookupError: string | null = null;
  if (orderId.length > 0) {
    try {
      shipment = await getDeliveryServices().getShipment(principal, orderId);
    } catch (error) {
      if (isAppError(error) && error.code === "not_found") {
        lookupError = t.admin.lookupEmpty;
      } else {
        throw error;
      }
    }
  }

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

      <form method="get" className={styles.form}>
        <h2>{t.admin.lookupTitle}</h2>
        <TextField
          name="orderId"
          label={t.admin.orderId}
          required
          defaultValue={orderId}
          autoComplete="off"
        />
        <Button type="submit">{t.admin.lookupSubmit}</Button>
        {lookupError ? (
          <p className={styles.error} role="status">
            {lookupError}
          </p>
        ) : null}
      </form>

      {shipment ? (
        <>
          <table className={styles.table}>
            <tbody>
              <tr>
                <th>{t.admin.shipmentStatus}</th>
                <td>{statusLabel(shipment.status)}</td>
              </tr>
              <tr>
                <th>{t.fields.deliveryMethod}</th>
                <td>{shipment.methodCode}</td>
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
        </>
      ) : null}

      <AssignShipmentForm
        methods={methods.map((method) => ({ code: method.code, name: method.name }))}
      />
      <MarkShippedForm />
      <MarkDeliveredForm />
      <CompleteOrderForm />
      <CancelOrderForm />
      <RefundPaymentForm />
    </div>
  );
}
