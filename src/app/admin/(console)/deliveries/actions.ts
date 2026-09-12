"use server";

import {
  getDeliveryServices,
  getOrderServices,
  getPaymentServices,
} from "@/app/api/_lib/compose";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { fromDateTimeLocal } from "../../_lib/datetime";
import { parsePriceBynToMinor } from "../../_lib/money";
import { recordAdminAudit } from "../../_lib/audit";
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
    const shipment = await getDeliveryServices().assignShipment(principal, {
      orderId,
      methodCode,
      costMinor,
    });
    await recordAdminAudit(principal, {
      action: "delivery.shipment.assign",
      entityType: "shipment",
      entityId: shipment.id,
      after: { orderId, methodCode },
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
    const shipment = await getDeliveryServices().updateTracking(
      principal,
      orderId,
      tracking,
    );
    await recordAdminAudit(principal, {
      action: "delivery.shipment.tracking",
      entityType: "shipment",
      entityId: shipment.id,
      after: { orderId },
    });
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
    await recordAdminAudit(principal, {
      action: "delivery.shipment.ship",
      entityType: "shipment",
      entityId: shipped.id,
      after: { orderId },
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
    const delivered = await getDeliveryServices().markDelivered(principal, orderId);
    await recordAdminAudit(principal, {
      action: "delivery.shipment.deliver",
      entityType: "shipment",
      entityId: delivered.id,
      after: { orderId },
    });
    return { ok: true, message: t.admin.markedDelivered };
  } catch (error) {
    return fail(error, t.admin.deliverFailed);
  }
}

export async function completeOrderAction(
  _previous: DeliveryFormState,
  formData: FormData,
): Promise<DeliveryFormState> {
  const principal = await requireAdminOrderManagement();
  const orderId = String(formData.get("orderId") ?? "").trim();
  if (!orderId) {
    return { ok: false, message: t.admin.completeFailed };
  }
  try {
    const order = await (await getOrderServices()).completeOrder(orderId, principal);
    await recordAdminAudit(principal, {
      action: "order.complete",
      entityType: "order",
      entityId: order.id,
      after: { status: order.status },
    });
    return { ok: true, message: t.admin.orderCompleted };
  } catch (error) {
    return fail(error, t.admin.completeFailed);
  }
}

export async function cancelOrderAction(
  _previous: DeliveryFormState,
  formData: FormData,
): Promise<DeliveryFormState> {
  const principal = await requireAdminOrderManagement();
  const orderId = String(formData.get("orderId") ?? "").trim();
  if (!orderId) {
    return { ok: false, message: t.admin.cancelFailed };
  }
  try {
    const orders = await getOrderServices();
    const order = await orders.cancelOrder(orderId, principal);
    await orders.applyFulfillmentEvent(orderId, principal, { type: "cancelled" });
    await recordAdminAudit(principal, {
      action: "order.cancel",
      entityType: "order",
      entityId: order.id,
      after: { status: "CANCELLED" },
    });
    return { ok: true, message: t.admin.orderCancelled };
  } catch (error) {
    return fail(error, t.admin.cancelFailed);
  }
}

export async function refundPaymentAction(
  _previous: DeliveryFormState,
  formData: FormData,
): Promise<DeliveryFormState> {
  const principal = await requireAdminOrderManagement();
  const paymentId = String(formData.get("paymentId") ?? "").trim();
  const amountMinor = parsePriceBynToMinor(String(formData.get("amountByn") ?? ""));
  if (!paymentId || amountMinor === null) {
    return { ok: false, message: t.admin.refundFailed };
  }
  try {
    const payment = await getPaymentServices().refundAsStaff(
      principal,
      paymentId,
      amountMinor,
    );
    await recordAdminAudit(principal, {
      action: "payment.refund",
      entityType: "payment",
      entityId: payment.id,
      after: { status: payment.status, amountMinor },
    });
    return { ok: true, message: t.admin.refundDone };
  } catch (error) {
    return fail(error, t.admin.refundFailed);
  }
}
