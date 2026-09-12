import { t } from "@/lib/i18n";
import type { FulfillmentStatus, OrderStatus, PaymentStatus } from "@/modules/orders";
import type { ShipmentStatus } from "@/modules/delivery";

export function orderStatusLabel(status: OrderStatus): string {
  if (status === "CANCELLED") {
    return t.account.cancelled;
  }
  if (status === "COMPLETED") {
    return t.account.completed;
  }
  return t.account.placed;
}

export function paymentStatusLabel(status: PaymentStatus): string {
  switch (status) {
    case "CREATED":
      return t.account.paymentCreated;
    case "AUTHORIZED":
      return t.account.paymentAuthorized;
    case "SUCCEEDED":
      return t.account.paymentSucceeded;
    case "FAILED":
      return t.account.paymentFailed;
    case "EXPIRED":
      return t.account.paymentExpired;
    case "CANCELLED":
      return t.account.paymentCancelled;
    case "REFUND_PENDING":
      return t.account.paymentRefundPending;
    case "REFUNDED":
      return t.account.paymentRefunded;
    case "PARTIALLY_REFUNDED":
      return t.account.paymentPartialRefund;
    default:
      return t.account.paymentPending;
  }
}

export function fulfillmentStatusLabel(status: FulfillmentStatus): string {
  switch (status) {
    case "ASSIGNED":
      return t.account.fulfillmentAssigned;
    case "SHIPPED":
      return t.account.fulfillmentShipped;
    case "DELIVERED":
      return t.account.fulfillmentDelivered;
    case "FAILED":
      return t.account.fulfillmentFailed;
    case "CANCELLED":
      return t.account.fulfillmentCancelled;
    default:
      return t.account.fulfillmentUnfulfilled;
  }
}

export function shipmentStatusLabel(status: ShipmentStatus): string {
  if (status === "SHIPPED") {
    return t.account.fulfillmentShipped;
  }
  if (status === "DELIVERED") {
    return t.account.fulfillmentDelivered;
  }
  if (status === "FAILED") {
    return t.account.fulfillmentFailed;
  }
  return t.account.fulfillmentAssigned;
}
