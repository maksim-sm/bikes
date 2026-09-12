"use server";

import { getCartServices } from "@/app/api/_lib/compose";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { MAX_LINE_QUANTITY, MIN_LINE_QUANTITY } from "@/modules/cart";
import { resolveCartActor } from "../_lib/cart-actor";

export type CartActionState = {
  ok: boolean;
  message: string;
};

function failure(error: unknown): CartActionState {
  if (isAppError(error) && error.code === "conflict") {
    return { ok: false, message: t.cart.unavailable };
  }
  if (isAppError(error) && error.code === "validation_failed") {
    return { ok: false, message: t.cart.updateFailed };
  }
  return { ok: false, message: t.cart.updateFailed };
}

export async function setCartQuantityAction(
  _previous: CartActionState | null,
  formData: FormData,
): Promise<CartActionState> {
  const variantId = String(formData.get("variantId") ?? "").trim();
  const quantity = Number(formData.get("quantity"));
  if (variantId.length === 0 || !Number.isInteger(quantity)) {
    return { ok: false, message: t.cart.updateFailed };
  }
  if (quantity < MIN_LINE_QUANTITY || quantity > MAX_LINE_QUANTITY) {
    return { ok: false, message: t.cart.updateFailed };
  }
  try {
    const actor = await resolveCartActor();
    await (await getCartServices()).setItemQuantity(actor, variantId, quantity);
    return { ok: true, message: t.cart.updated };
  } catch (error) {
    return failure(error);
  }
}

export async function replaceCartVariantAction(
  _previous: CartActionState | null,
  formData: FormData,
): Promise<CartActionState> {
  const fromVariantId = String(formData.get("fromVariantId") ?? "").trim();
  const toVariantId = String(formData.get("toVariantId") ?? "").trim();
  if (fromVariantId.length === 0 || toVariantId.length === 0) {
    return { ok: false, message: t.cart.updateFailed };
  }
  try {
    const actor = await resolveCartActor();
    await (await getCartServices()).replaceItemVariant(actor, fromVariantId, toVariantId);
    return { ok: true, message: t.cart.updated };
  } catch (error) {
    return failure(error);
  }
}

export async function removeCartItemAction(
  _previous: CartActionState | null,
  formData: FormData,
): Promise<CartActionState> {
  const variantId = String(formData.get("variantId") ?? "").trim();
  if (variantId.length === 0) {
    return { ok: false, message: t.cart.updateFailed };
  }
  try {
    const actor = await resolveCartActor();
    await (await getCartServices()).removeItem(actor, variantId);
    return { ok: true, message: t.cart.removed };
  } catch (error) {
    return failure(error);
  }
}
