import type { Order, PaymentStatus } from "./order";

export type OrderAnomalyCode =
  | "succeeded_payment_on_cancelled_order"
  | "succeeded_payment_without_hold"
  | "shipped_without_success";

export interface OrderAnomaly {
  code: OrderAnomalyCode;
  orderId: string;
  orderNumber: string;
}

const SETTLED_SUCCESS: ReadonlySet<PaymentStatus> = new Set([
  "SUCCEEDED",
  "REFUND_PENDING",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
]);

const COD = new Set(["cash_on_delivery", "card_on_delivery"]);

export function detectOrderAnomalies(input: {
  orders: readonly Order[];
  paymentStatuses: ReadonlyMap<string, readonly PaymentStatus[]>;
  hasActiveHold: ReadonlyMap<string, boolean>;
}): OrderAnomaly[] {
  const found: OrderAnomaly[] = [];
  for (const order of input.orders) {
    const statuses = input.paymentStatuses.get(order.id) ?? [];
    const succeeded = statuses.includes("SUCCEEDED");
    const refunded = statuses.some(
      (status) =>
        status === "REFUNDED" ||
        status === "PARTIALLY_REFUNDED" ||
        status === "REFUND_PENDING",
    );
    if (order.status === "CANCELLED" && succeeded && !refunded) {
      found.push({
        code: "succeeded_payment_on_cancelled_order",
        orderId: order.id,
        orderNumber: order.number,
      });
    }
    if (
      order.status === "PLACED" &&
      succeeded &&
      input.hasActiveHold.get(order.id) !== true
    ) {
      found.push({
        code: "succeeded_payment_without_hold",
        orderId: order.id,
        orderNumber: order.number,
      });
    }
    const shipped =
      order.fulfillmentStatus === "SHIPPED" || order.fulfillmentStatus === "DELIVERED";
    const paid = statuses.some((status) => SETTLED_SUCCESS.has(status));
    if (shipped && !paid && !COD.has(order.paymentMethodCode)) {
      found.push({
        code: "shipped_without_success",
        orderId: order.id,
        orderNumber: order.number,
      });
    }
  }
  return found;
}
