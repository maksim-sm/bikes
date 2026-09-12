export type OrderStatus = "PLACED" | "CANCELLED" | "COMPLETED";
export type PaymentStatus =
  | "PENDING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";
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

export function projectPaymentStatus(event: {
  type: "succeeded" | "failed" | "cancelled" | "refunded" | "partially_refunded";
}): PaymentStatus {
  if (event.type === "succeeded") {
    return "SUCCEEDED";
  }
  if (event.type === "failed") {
    return "FAILED";
  }
  if (event.type === "cancelled") {
    return "CANCELLED";
  }
  if (event.type === "refunded") {
    return "REFUNDED";
  }
  return "PARTIALLY_REFUNDED";
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
