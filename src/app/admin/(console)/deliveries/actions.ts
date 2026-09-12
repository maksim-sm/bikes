"use server";

import { getDeliveryServices } from "@/app/api/_lib/compose";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { fromDateTimeLocal } from "../../_lib/datetime";
import { parsePriceBynToMinor } from "../../_lib/money";
import { requireAdminOrderManagement } from "../../_lib/staff";

export type DeliveryFormState = { ok: boolean; message: string } | null;

function fail(error: unknown, fallback: string): DeliveryFormState {
  if (isAppError(error) && error.code === "conflict") {
    return { ok: false, message: t.admin.shipmentExists };
  }
  if (isAppError(error) && error.code === "not_found") {
    return { ok: false, message: t.admin.lookupEmpty };
  }
  if (isAppError(error) && error.code === "validation_failed") {
    return { ok: false, message: t.admin.invalidTracking };
  }
  return { ok: false, message: fallback };
}

function readTracking(formData: FormData) {
  const shippedAt = fromDateTimeLocal(String(formData.get("shippedAt") ?? ""));
  const deliveredAt = fromDateTimeLocal(String(formData.get("deliveredAt") ?? ""));
  if (shippedAt === "invalid" || deliveredAt === "invalid") {
    return null;
  }
  return {
    carrierName: String(formData.get("carrierName") ?? ""),
    trackingNumber: String(formData.get("trackingNumber") ?? ""),
    trackingUrl: String(formData.get("trackingUrl") ?? ""),
    shippedAt,
    deliveredAt,
    notes: String(formData.get("notes") ?? ""),
  };
}

export async function assignShipmentAction(
  _previous: DeliveryFormState,
  formData: FormData,
): Promise<DeliveryFormState> {
  const principal = await requireAdminOrderManagement();
  const orderId = String(formData.get("orderId") ?? "").trim();
  const methodCode = String(formData.get("methodCode") ?? "").trim();
  const costMinor = parsePriceBynToMinor(String(formData.get("costByn") ?? ""));
  if (!orderId || !methodCode || costMinor === null) {
    return { ok: false, message: t.admin.invalidCost };
  }
  try {
    await getDeliveryServices().assignShipment(principal, {
      orderId,
      methodCode,
      costMinor,
    });
    return { ok: true, message: t.admin.assigned };
  } catch (error) {
    return fail(error, t.admin.assignFailed);
  }
}

export async function updateTrackingAction(
  _previous: DeliveryFormState,
  formData: FormData,
): Promise<DeliveryFormState> {
  const principal = await requireAdminOrderManagement();
  const orderId = String(formData.get("orderId") ?? "").trim();
  const tracking = readTracking(formData);
  if (!orderId || tracking === null) {
    return { ok: false, message: t.admin.invalidTracking };
  }
  try {
    await getDeliveryServices().updateTracking(principal, orderId, tracking);
    return { ok: true, message: t.admin.trackingSaved };
  } catch (error) {
    return fail(error, t.admin.trackingFailed);
  }
}

export async function markShippedAction(
  _previous: DeliveryFormState,
  formData: FormData,
): Promise<DeliveryFormState> {
  const principal = await requireAdminOrderManagement();
  const orderId = String(formData.get("orderId") ?? "").trim();
  const trackingNumber = String(formData.get("trackingNumber") ?? "").trim();
  if (!orderId || !trackingNumber) {
    return { ok: false, message: t.admin.shipFailed };
  }
  try {
    const delivery = getDeliveryServices();
    const shipped = await delivery.markShipped(principal, orderId, trackingNumber);
    await delivery.updateTracking(principal, orderId, {
      carrierName: String(formData.get("carrierName") ?? ""),
      trackingNumber: shipped.trackingNumber,
      trackingUrl: String(formData.get("trackingUrl") ?? ""),
      shippedAt: shipped.shippedAt,
      deliveredAt: shipped.deliveredAt,
      notes: String(formData.get("notes") ?? ""),
    });
    return { ok: true, message: t.admin.shipped };
  } catch (error) {
    return fail(error, t.admin.shipFailed);
  }
}

export async function markDeliveredAction(
  _previous: DeliveryFormState,
  formData: FormData,
): Promise<DeliveryFormState> {
  const principal = await requireAdminOrderManagement();
  const orderId = String(formData.get("orderId") ?? "").trim();
  if (!orderId) {
    return { ok: false, message: t.admin.deliverFailed };
  }
  try {
    await getDeliveryServices().markDelivered(principal, orderId);
    return { ok: true, message: t.admin.markedDelivered };
  } catch (error) {
    return fail(error, t.admin.deliverFailed);
  }
}
