export type OrderStatus = "PLACED" | "CANCELLED" | "COMPLETED";
export type PaymentStatus =
  | "CREATED"
  | "PENDING"
  | "AUTHORIZED"
  | "SUCCEEDED"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED"
  | "REFUND_PENDING"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export type PaymentProjectionEvent = {
  type:
    | "created"
    | "pending"
    | "authorized"
    | "succeeded"
    | "failed"
    | "expired"
    | "cancelled"
    | "refund_pending"
    | "refunded"
    | "partially_refunded";
};
export type FulfillmentStatus =
  | "UNFULFILLED"
  | "ASSIGNED"
  | "SHIPPED"
  | "DELIVERED"
  | "FAILED"
  | "CANCELLED";

export interface OrderLine {
  variantId: string;
  sku: string;
  productName: string;
  brandName: string;
  frameSize: string;
  color: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
}

export interface OrderShipping {
  recipientName: string;
  phone: string;
  countryCode: "BY";
  region: string;
  city: string;
  street: string;
  postalCode: string;
}

export interface Order {
  id: string;
  number: string;
  userId: string | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  fulfillmentStatus: FulfillmentStatus;
  currency: "BYN";
  subtotalMinor: number;
  deliveryCostMinor: number;
  totalMinor: number;
  deliveryMethodCode: string;
  deliveryMethodName: string;
  customerEmail: string;
  customerName: string;
  customerPhone: string;
  paymentMethodCode: string;
  shipping: OrderShipping;
  items: OrderLine[];
}

export function formatOrderNumber(placedAt: Date, sequence: number): string {
  const day = placedAt.toISOString().slice(0, 10).replaceAll("-", "");
  return `B-${day}-${String(sequence).padStart(4, "0")}`;
}

export function transitionOrder(
  status: OrderStatus,
  action: "cancel" | "complete",
): OrderStatus {
  if (status !== "PLACED") {
    throw new Error("order_not_open");
  }
  return action === "cancel" ? "CANCELLED" : "COMPLETED";
}

export function projectPaymentStatus(event: PaymentProjectionEvent): PaymentStatus {
  switch (event.type) {
    case "created":
      return "CREATED";
    case "pending":
      return "PENDING";
    case "authorized":
      return "AUTHORIZED";
    case "succeeded":
      return "SUCCEEDED";
    case "failed":
      return "FAILED";
    case "expired":
      return "EXPIRED";
    case "cancelled":
      return "CANCELLED";
    case "refund_pending":
      return "REFUND_PENDING";
    case "refunded":
      return "REFUNDED";
    case "partially_refunded":
      return "PARTIALLY_REFUNDED";
  }
}

export function projectFulfillmentStatus(event: {
  type: "assigned" | "shipped" | "delivered" | "failed" | "cancelled";
}): FulfillmentStatus {
  if (event.type === "assigned") {
    return "ASSIGNED";
  }
  if (event.type === "shipped") {
    return "SHIPPED";
  }
  if (event.type === "delivered") {
    return "DELIVERED";
  }
  if (event.type === "failed") {
    return "FAILED";
  }
  return "CANCELLED";
}
