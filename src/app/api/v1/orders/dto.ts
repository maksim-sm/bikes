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
  customerName: string;
  shipping: {
    recipientName: string;
    city: string;
    region: string;
    street: string;
    postalCode: string;
  };
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
    customerName: order.customerName,
    shipping: {
      recipientName: order.shipping.recipientName,
      city: order.shipping.city,
      region: order.shipping.region,
      street: order.shipping.street,
      postalCode: order.shipping.postalCode,
    },
    items: order.items.map((item) => ({
      sku: item.sku,
      productName: item.productName,
      quantity: item.quantity,
      unitPriceMinor: item.unitPriceMinor,
      lineTotalMinor: item.lineTotalMinor,
    })),
  };
}
