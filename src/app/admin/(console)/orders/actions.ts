"use server";

import { getOrderServices, getPaymentServices } from "@/app/api/_lib/compose";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { parsePriceBynToMinor } from "../../_lib/money";
import { recordAdminAudit } from "../../_lib/audit";
import { requireAdminOrderManagement } from "../../_lib/staff";

export type OrderFormState = { ok: boolean; message: string } | null;

function fail(error: unknown, fallback: string): OrderFormState {
  if (isAppError(error) && error.code === "conflict") {
    return { ok: false, message: fallback };
  }
  if (isAppError(error) && error.code === "validation_failed") {
    return { ok: false, message: fallback };
  }
  if (isAppError(error) && error.code === "not_found") {
    return { ok: false, message: fallback };
  }
  return { ok: false, message: fallback };
}

export async function completeOrderAction(
  _previous: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
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
  _previous: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  const principal = await requireAdminOrderManagement();
  const orderId = String(formData.get("orderId") ?? "").trim();
  if (!orderId) {
    return { ok: false, message: t.admin.cancelFailed };
  }
  try {
    const order = await (await getOrderServices()).cancelOrder(orderId, principal);
    await (
      await getOrderServices()
    ).applyFulfillmentEvent(orderId, principal, {
      type: "cancelled",
    });
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

export async function updateStaffNotesAction(
  _previous: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
  const principal = await requireAdminOrderManagement();
  const orderId = String(formData.get("orderId") ?? "").trim();
  const notes = String(formData.get("staffNotes") ?? "");
  if (!orderId) {
    return { ok: false, message: t.admin.staffNotesFailed };
  }
  try {
    const order = await (
      await getOrderServices()
    ).updateStaffNotes(orderId, principal, notes);
    await recordAdminAudit(principal, {
      action: "order.notes",
      entityType: "order",
      entityId: order.id,
      after: { hasNotes: order.staffNotes !== null },
    });
    return { ok: true, message: t.admin.staffNotesSaved };
  } catch (error) {
    return fail(error, t.admin.staffNotesFailed);
  }
}

export async function refundPaymentAction(
  _previous: OrderFormState,
  formData: FormData,
): Promise<OrderFormState> {
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
