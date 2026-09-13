import { describe, expect, it } from "vitest";
import { t } from "@/lib/i18n";
import { mapCheckoutServerFields, validateCheckoutForm } from "./validate";

const valid = {
  customerName: "Иван",
  customerEmail: "ivan@example.by",
  customerPhone: "+375291112233",
  recipientName: "Иван",
  shippingPhone: "+375291112233",
  region: "Минск",
  city: "Минск",
  street: "Независимости 1",
  postalCode: "220000",
  deliveryMethodCode: "minsk-courier",
  paymentMethodCode: "cash_on_delivery",
  consent: true,
  addressRequired: true,
};

describe("checkout form validation", () => {
  it("accepts a complete guest order and does not require an account", () => {
    expect(validateCheckoutForm(valid)).toEqual({});
  });

  it("surfaces field errors for contact, payment, and consent", () => {
    expect(
      validateCheckoutForm({
        ...valid,
        customerEmail: "ivan",
        paymentMethodCode: "",
        consent: false,
      }),
    ).toEqual({
      customerEmail: t.form.invalidEmail,
      paymentMethodCode: t.form.chooseOption,
      consent: t.checkout.consentRequired,
    });
  });

  it("skips street fields when the customer chose pickup", () => {
    expect(
      validateCheckoutForm({
        ...valid,
        street: "",
        postalCode: "",
        recipientName: "",
        shippingPhone: "",
        deliveryMethodCode: "minsk-pickup",
        addressRequired: false,
      }),
    ).toEqual({});
  });

  it("maps server validation messages onto fields", () => {
    expect(mapCheckoutServerFields("checkout email invalid")).toEqual({
      customerEmail: t.form.invalidEmail,
    });
    expect(mapCheckoutServerFields("checkout_shipping_phone_invalid")).toEqual({
      shippingPhone: t.form.invalidPhone,
    });
    expect(mapCheckoutServerFields("checkout_recipient_required")).toEqual({
      recipientName: t.form.required,
    });
    expect(mapCheckoutServerFields("checkout_payment_invalid")).toEqual({
      paymentMethodCode: t.form.chooseOption,
    });
    expect(mapCheckoutServerFields("checkout_street_required")).toEqual({
      street: t.form.required,
    });
  });

  it("rejects an invalid phone and required address fields when delivery needs a street", () => {
    expect(
      validateCheckoutForm({
        ...valid,
        customerPhone: "12 345",
        recipientName: "",
        shippingPhone: "99",
        street: "",
        postalCode: "",
        addressRequired: true,
      }),
    ).toEqual({
      customerPhone: t.form.invalidPhone,
      recipientName: t.form.required,
      shippingPhone: t.form.invalidPhone,
      street: t.form.required,
      postalCode: t.form.required,
    });
  });
});
