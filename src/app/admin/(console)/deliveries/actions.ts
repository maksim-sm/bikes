"use server";

import { getDeliveryServices } from "@/app/api/_lib/compose";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
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
  return { ok: false, message: fallback };
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
    await getDeliveryServices().markShipped(principal, orderId, trackingNumber);
    return { ok: true, message: t.admin.shipped };
  } catch (error) {
    return fail(error, t.admin.shipFailed);
  }
}
