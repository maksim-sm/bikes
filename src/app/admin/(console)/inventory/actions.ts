"use server";

import { getInventoryServices } from "@/app/api/_lib/compose";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { recordAdminAudit } from "../../_lib/audit";
import { requireAdminInventory } from "../../_lib/staff";

export type InventoryFormState = { ok: boolean; message: string } | null;

function readQuantity(formData: FormData): number | null {
  const raw = String(formData.get("quantity") ?? "").trim();
  if (!/^[1-9]\d{0,6}$/.test(raw)) {
    return null;
  }
  return Number(raw);
}

function fail(error: unknown, fallback: string): InventoryFormState {
  if (isAppError(error) && error.code === "conflict") {
    return { ok: false, message: t.admin.adjustBelowReserved };
  }
  if (isAppError(error) && error.code === "not_found") {
    return { ok: false, message: t.admin.inventoryNotFound };
  }
  if (isAppError(error) && error.code === "validation_failed") {
    return { ok: false, message: t.admin.invalidQuantity };
  }
  return { ok: false, message: fallback };
}

async function writeStock(
  formData: FormData,
  action: "receive" | "adjust" | "return",
): Promise<InventoryFormState> {
  const principal = await requireAdminInventory();
  const variantId = String(formData.get("variantId") ?? "").trim();
  const quantity = readQuantity(formData);
  const note = String(formData.get("reason") ?? "").trim();
  if (!variantId) {
    return { ok: false, message: t.admin.inventoryNotFound };
  }
  if (quantity === null) {
    return { ok: false, message: t.admin.invalidQuantity };
  }
  if (note.length === 0) {
    return { ok: false, message: t.admin.reasonRequired };
  }
  const inventory = await getInventoryServices();
  const messages = {
    receive: { ok: t.admin.receiveOk, fail: t.admin.receiveFailed },
    adjust: { ok: t.admin.adjustOk, fail: t.admin.adjustFailed },
    return: { ok: t.admin.returnOk, fail: t.admin.returnFailed },
  } as const;
  try {
    const before = await inventory.getStaffStock(principal, variantId);
    const write =
      action === "receive"
        ? inventory.receiveStock
        : action === "adjust"
          ? inventory.adjustStock
          : inventory.returnStock;
    const after = await write(principal, { variantId, quantity, note });
    await recordAdminAudit(principal, {
      action: `inventory.${action}`,
      entityType: "inventory_item",
      entityId: variantId,
      before,
      after: { ...after, reason: note, quantity },
    });
    return { ok: true, message: messages[action].ok };
  } catch (error) {
    return fail(error, messages[action].fail);
  }
}

export async function receiveStockAction(
  _previous: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  return writeStock(formData, "receive");
}

export async function adjustStockAction(
  _previous: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  return writeStock(formData, "adjust");
}

export async function returnStockAction(
  _previous: InventoryFormState,
  formData: FormData,
): Promise<InventoryFormState> {
  return writeStock(formData, "return");
}
