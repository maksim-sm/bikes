export interface CheckoutCustomer {
  customerEmail: string;
  customerName: string;
  customerPhone: string;
}

export interface CheckoutDestination {
  recipientName: string;
  phone: string;
  region: string;
  city: string;
  street: string;
  postalCode: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_DIGITS = /\d{6,}/;

function required(value: string, field: string): string {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new Error(`checkout_${field}_required`);
  }
  return trimmed;
}

export function assertCheckoutCustomer(input: CheckoutCustomer): CheckoutCustomer {
  const customerEmail = required(input.customerEmail, "email").toLowerCase();
  if (!EMAIL.test(customerEmail)) {
    throw new Error("checkout_email_invalid");
  }
  const customerPhone = required(input.customerPhone, "phone");
  if (!PHONE_DIGITS.test(customerPhone.replaceAll(/\s+/g, ""))) {
    throw new Error("checkout_phone_invalid");
  }
  return {
    customerEmail,
    customerName: required(input.customerName, "name"),
    customerPhone,
  };
}

export function assertCheckoutDestination(
  input: CheckoutDestination,
): CheckoutDestination {
  return {
    recipientName: required(input.recipientName, "recipient"),
    phone: required(input.phone, "shipping_phone"),
    region: required(input.region, "region"),
    city: required(input.city, "city"),
    street: required(input.street, "street"),
    postalCode: required(input.postalCode, "postal_code"),
  };
}

export function checkoutTotals(
  lineTotalsMinor: readonly number[],
  deliveryCostMinor: number,
): { subtotalMinor: number; deliveryCostMinor: number; totalMinor: number } {
  if (!Number.isInteger(deliveryCostMinor) || deliveryCostMinor < 0) {
    throw new Error("checkout_delivery_cost_invalid");
  }
  let subtotalMinor = 0;
  for (const amount of lineTotalsMinor) {
    if (!Number.isInteger(amount) || amount < 0) {
      throw new Error("checkout_line_total_invalid");
    }
    subtotalMinor += amount;
  }
  return {
    subtotalMinor,
    deliveryCostMinor,
    totalMinor: subtotalMinor + deliveryCostMinor,
  };
}
