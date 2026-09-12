"use server";

import { getCartServices } from "@/app/api/_lib/compose";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { getOrCreateGuestActor } from "../../_lib/guest-cart";

export type AddToCartState = {
  ok: boolean;
  message: string;
};

export async function addToCartAction(
  _previous: AddToCartState | null,
  formData: FormData,
): Promise<AddToCartState> {
  const variantId = String(formData.get("variantId") ?? "").trim();
  if (variantId.length === 0) {
    return { ok: false, message: t.product.pickVariant };
  }
  try {
    const actor = await getOrCreateGuestActor();
    await getCartServices().addItem(actor, variantId, 1);
    return { ok: true, message: t.product.addedToCart };
  } catch (error) {
    if (isAppError(error) && error.code === "conflict") {
      return { ok: false, message: t.product.unavailable };
    }
    return { ok: false, message: t.product.addFailed };
  }
}
