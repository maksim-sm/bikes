"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";
import { getCartServices, getOrderServices } from "@/app/api/_lib/compose";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { readCartActor } from "../_lib/cart-actor";

export type CheckoutActionState = {
  ok: boolean;
  message: string;
};

function failure(error: unknown): CheckoutActionState {
  if (isAppError(error) && error.code === "conflict") {
    if (error.message.includes("inventory")) {
      return { ok: false, message: t.checkout.insufficient };
    }
    if (error.message.includes("delivery")) {
      return { ok: false, message: t.checkout.deliveryUnavailable };
    }
    return { ok: false, message: t.checkout.unavailable };
  }
  if (isAppError(error) && error.code === "validation_failed") {
    if (error.message.includes("email")) {
      return { ok: false, message: t.form.invalidEmail };
    }
    if (error.message.includes("phone")) {
      return { ok: false, message: t.form.invalidPhone };
    }
    if (error.message.includes("cart")) {
      return { ok: false, message: t.checkout.cartInvalid };
    }
    return { ok: false, message: t.checkout.failed };
  }
  return { ok: false, message: t.checkout.failed };
}

export async function placeCheckoutAction(
  _previous: CheckoutActionState | null,
  formData: FormData,
): Promise<CheckoutActionState> {
  const actor = await readCartActor();
  if (!actor) {
    return { ok: false, message: t.checkout.cartInvalid };
  }

  let cart;
  try {
    cart = await (await getCartServices()).getCart(actor);
  } catch (error) {
    return failure(error);
  }

  let order;
  try {
    order = await (
      await getOrderServices()
    ).checkout({
      cartId: cart.id,
      actorUserId: actor.kind === "customer" ? actor.userId : null,
      guestToken: actor.kind === "guest" ? actor.guestToken : null,
      customerEmail: String(formData.get("customerEmail") ?? ""),
      customerName: String(formData.get("customerName") ?? ""),
      customerPhone: String(formData.get("customerPhone") ?? ""),
      destination: {
        recipientName: String(formData.get("recipientName") ?? ""),
        phone: String(formData.get("shippingPhone") ?? ""),
        region: String(formData.get("region") ?? ""),
        city: String(formData.get("city") ?? ""),
        street: String(formData.get("street") ?? ""),
        postalCode: String(formData.get("postalCode") ?? ""),
      },
      deliveryMethodCode: String(formData.get("deliveryMethodCode") ?? ""),
    });
  } catch (error) {
    return failure(error);
  }
  redirect(`/checkout/confirmation/${order.id}` as Route);
}
