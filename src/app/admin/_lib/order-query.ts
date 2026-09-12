import type {
  AdminOrderQuery,
  FulfillmentStatus,
  OrderStatus,
  PaymentStatus,
} from "@/modules/orders";

const ORDER_STATUSES = new Set<OrderStatus>(["PLACED", "CANCELLED", "COMPLETED"]);
const PAYMENT_STATUSES = new Set<PaymentStatus>([
  "CREATED",
  "PENDING",
  "AUTHORIZED",
  "SUCCEEDED",
  "FAILED",
  "EXPIRED",
  "CANCELLED",
  "REFUND_PENDING",
  "REFUNDED",
  "PARTIALLY_REFUNDED",
]);
const FULFILLMENT_STATUSES = new Set<FulfillmentStatus>([
  "UNFULFILLED",
  "ASSIGNED",
  "SHIPPED",
  "DELIVERED",
  "FAILED",
  "CANCELLED",
]);

export function parseAdminOrderQuery(params: {
  q?: string;
  status?: string;
  paymentStatus?: string;
  fulfillmentStatus?: string;
}): AdminOrderQuery {
  const query: AdminOrderQuery = {};
  const q = params.q?.trim();
  if (q) {
    query.q = q;
  }
  if (params.status && ORDER_STATUSES.has(params.status as OrderStatus)) {
    query.status = params.status as OrderStatus;
  }
  if (
    params.paymentStatus &&
    PAYMENT_STATUSES.has(params.paymentStatus as PaymentStatus)
  ) {
    query.paymentStatus = params.paymentStatus as PaymentStatus;
  }
  if (
    params.fulfillmentStatus &&
    FULFILLMENT_STATUSES.has(params.fulfillmentStatus as FulfillmentStatus)
  ) {
    query.fulfillmentStatus = params.fulfillmentStatus as FulfillmentStatus;
  }
  return query;
}
