import { t } from "@/lib/i18n";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_DIGITS = /\d{6,}/;

export const CHECKOUT_PAYMENT_CODES = [
  "cash_on_delivery",
  "card_on_delivery",
  "bank_transfer",
] as const;

export type CheckoutField =
  | "customerName"
  | "customerEmail"
  | "customerPhone"
  | "recipientName"
  | "shippingPhone"
  | "region"
  | "city"
  | "street"
  | "postalCode"
  | "deliveryMethodCode"
  | "paymentMethodCode"
  | "consent";

export type CheckoutFieldErrors = Partial<Record<CheckoutField, string>>;

export interface CheckoutFormValues {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  recipientName: string;
  shippingPhone: string;
  region: string;
  city: string;
  street: string;
  postalCode: string;
  deliveryMethodCode: string;
  paymentMethodCode: string;
  consent: boolean;
  addressRequired: boolean;
}

function required(value: string): string {
  return value.trim();
}

export function validateCheckoutForm(values: CheckoutFormValues): CheckoutFieldErrors {
  const errors: CheckoutFieldErrors = {};
  if (required(values.customerName).length === 0) {
    errors.customerName = t.form.required;
  }
  const email = required(values.customerEmail).toLowerCase();
  if (email.length === 0) {
    errors.customerEmail = t.form.required;
  } else if (!EMAIL.test(email)) {
    errors.customerEmail = t.form.invalidEmail;
  }
  const phone = required(values.customerPhone);
  if (phone.length === 0) {
    errors.customerPhone = t.form.required;
  } else if (!PHONE_DIGITS.test(phone.replaceAll(/\s+/g, ""))) {
    errors.customerPhone = t.form.invalidPhone;
  }
  if (required(values.region).length === 0) {
    errors.region = t.form.required;
  }
  if (required(values.city).length === 0) {
    errors.city = t.form.required;
  }
  if (values.addressRequired) {
    if (required(values.recipientName).length === 0) {
      errors.recipientName = t.form.required;
    }
    const shippingPhone = required(values.shippingPhone);
    if (shippingPhone.length === 0) {
      errors.shippingPhone = t.form.required;
    } else if (!PHONE_DIGITS.test(shippingPhone.replaceAll(/\s+/g, ""))) {
      errors.shippingPhone = t.form.invalidPhone;
    }
    if (required(values.street).length === 0) {
      errors.street = t.form.required;
    }
    if (required(values.postalCode).length === 0) {
      errors.postalCode = t.form.required;
    }
  }
  if (required(values.deliveryMethodCode).length === 0) {
    errors.deliveryMethodCode = t.form.chooseOption;
  }
  if (!(CHECKOUT_PAYMENT_CODES as readonly string[]).includes(values.paymentMethodCode)) {
    errors.paymentMethodCode = t.form.chooseOption;
  }
  if (!values.consent) {
    errors.consent = t.checkout.consentRequired;
  }
  return errors;
}

export function mapCheckoutServerFields(message: string): CheckoutFieldErrors {
  const errors: CheckoutFieldErrors = {};
  if (message.includes("email")) {
    errors.customerEmail = t.form.invalidEmail;
  }
  if (message.includes("phone") && !message.includes("shipping")) {
    errors.customerPhone = t.form.invalidPhone;
  }
  if (message.includes("name") && !message.includes("recipient")) {
    errors.customerName = t.form.required;
  }
  if (message.includes("recipient")) {
    errors.recipientName = t.form.required;
  }
  if (message.includes("shipping")) {
    errors.shippingPhone = t.form.invalidPhone;
  }
  if (message.includes("region")) {
    errors.region = t.form.required;
  }
  if (message.includes("city")) {
    errors.city = t.form.required;
  }
  if (message.includes("street")) {
    errors.street = t.form.required;
  }
  if (message.includes("postal")) {
    errors.postalCode = t.form.required;
  }
  if (message.includes("payment")) {
    errors.paymentMethodCode = t.form.chooseOption;
  }
  if (message.includes("consent")) {
    errors.consent = t.checkout.consentRequired;
  }
  return errors;
}
