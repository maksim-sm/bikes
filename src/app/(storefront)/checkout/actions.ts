"use server";

import type { Route } from "next";
import { redirect } from "next/navigation";
import {
  getCartServices,
  getDeliveryServices,
  getOrderServices,
} from "@/app/api/_lib/compose";
import { isAppError } from "@/lib/errors";
import { t } from "@/lib/i18n";
import { readCartActor } from "../_lib/cart-actor";
import {
  mapCheckoutServerFields,
  validateCheckoutForm,
  type CheckoutFieldErrors,
} from "./validate";

export type CheckoutActionState = {
  ok: boolean;
  message: string;
  fields: CheckoutFieldErrors;
};

function read(formData: FormData, name: string): string {
  return String(formData.get(name) ?? "");
}

function failure(error: unknown): CheckoutActionState {
  if (isAppError(error) && error.code === "conflict") {
    if (error.message.includes("inventory")) {
      return { ok: false, message: t.checkout.insufficient, fields: {} };
    }
    if (error.message.includes("delivery")) {
      return { ok: false, message: t.checkout.deliveryUnavailable, fields: {} };
    }
    return { ok: false, message: t.checkout.unavailable, fields: {} };
  }
  if (isAppError(error) && error.code === "validation_failed") {
    const fields = mapCheckoutServerFields(error.message);
    if (error.message.includes("email")) {
      return { ok: false, message: t.form.invalidEmail, fields };
    }
    if (error.message.includes("phone")) {
      return { ok: false, message: t.form.invalidPhone, fields };
    }
    if (error.message.includes("cart")) {
      return { ok: false, message: t.checkout.cartInvalid, fields };
    }
    if (error.message.includes("payment")) {
      return { ok: false, message: t.form.chooseOption, fields };
    }
    if (error.message.includes("consent")) {
      return { ok: false, message: t.checkout.consentRequired, fields };
    }
    return { ok: false, message: t.checkout.failed, fields };
  }
  return { ok: false, message: t.checkout.failed, fields: {} };
}

export async function placeCheckoutAction(
  _previous: CheckoutActionState | null,
  formData: FormData,
): Promise<CheckoutActionState> {
  const actor = await readCartActor();
  if (!actor) {
    return { ok: false, message: t.checkout.cartInvalid, fields: {} };
  }

  const deliveryMethodCode = read(formData, "deliveryMethodCode");
  const quote = await getDeliveryServices().quote(deliveryMethodCode, {
    region: read(formData, "region"),
    city: read(formData, "city"),
  });
  const pickup = quote?.kind === "pickup" ? quote.pickup : null;
  const sameRecipient = pickup !== null || read(formData, "sameRecipient") === "on";
  const addressRequired = pickup === null;
  const customerName = read(formData, "customerName");
  const customerPhone = read(formData, "customerPhone");
  const values = {
    customerName,
    customerEmail: read(formData, "customerEmail"),
    customerPhone,
    recipientName: sameRecipient ? customerName : read(formData, "recipientName"),
    shippingPhone: sameRecipient ? customerPhone : read(formData, "shippingPhone"),
    region: pickup?.region ?? read(formData, "region"),
    city: pickup?.city ?? read(formData, "city"),
    street: pickup?.street ?? read(formData, "street"),
    postalCode: pickup?.postalCode ?? read(formData, "postalCode"),
    deliveryMethodCode,
    paymentMethodCode: read(formData, "paymentMethodCode"),
    consent: read(formData, "consent") === "on",
    addressRequired,
  };
  const fields = validateCheckoutForm(values);
  if (Object.keys(fields).length > 0) {
    const first = Object.values(fields)[0] ?? t.checkout.failed;
    return { ok: false, message: first, fields };
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
      customerEmail: values.customerEmail,
      customerName: values.customerName,
      customerPhone: values.customerPhone,
      destination: {
        recipientName: values.recipientName,
        phone: values.shippingPhone,
        region: values.region,
        city: values.city,
        street: values.street,
        postalCode: values.postalCode,
      },
      deliveryMethodCode: values.deliveryMethodCode,
      paymentMethodCode: values.paymentMethodCode,
    });
  } catch (error) {
    return failure(error);
  }
  redirect(`/checkout/confirmation/${order.id}` as Route);
}
