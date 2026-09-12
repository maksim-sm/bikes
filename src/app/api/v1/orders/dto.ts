import type { Order } from "@/modules/orders";

export interface OrderDto {
  id: string;
  number: string;
  status: Order["status"];
  paymentStatus: Order["paymentStatus"];
  fulfillmentStatus: Order["fulfillmentStatus"];
  currency: "BYN";
  subtotalMinor: number;
  deliveryCostMinor: number;
  totalMinor: number;
  deliveryMethodCode: string;
  deliveryMethodName: string;
  paymentMethodCode: string;
  items: Array<{
    sku: string;
    productName: string;
    quantity: number;
    unitPriceMinor: number;
    lineTotalMinor: number;
  }>;
}

export function toOrderDto(order: Order): OrderDto {
  return {
    id: order.id,
    number: order.number,
    status: order.status,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    currency: order.currency,
    subtotalMinor: order.subtotalMinor,
    deliveryCostMinor: order.deliveryCostMinor,
    totalMinor: order.totalMinor,
    deliveryMethodCode: order.deliveryMethodCode,
    deliveryMethodName: order.deliveryMethodName,
    paymentMethodCode: order.paymentMethodCode,
    items: order.items.map((item) => ({
      sku: item.sku,
      productName: item.productName,
      quantity: item.quantity,
      unitPriceMinor: item.unitPriceMinor,
      lineTotalMinor: item.lineTotalMinor,
    })),
  };
}
