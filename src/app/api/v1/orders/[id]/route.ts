import { withRoute } from "@/app/api/_lib/route";
import { getOrderRepository } from "@/app/api/_lib/compose";
import { createOrderServices, type Order } from "@/modules/orders";

export const dynamic = "force-dynamic";

export interface OrderDto {
  number: string;
  status: Order["status"];
  paymentStatus: Order["paymentStatus"];
  fulfillmentStatus: Order["fulfillmentStatus"];
  currency: "BYN";
  subtotalMinor: number;
  deliveryCostMinor: number;
  totalMinor: number;
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
    number: order.number,
    status: order.status,
    paymentStatus: order.paymentStatus,
    fulfillmentStatus: order.fulfillmentStatus,
    currency: order.currency,
    subtotalMinor: order.subtotalMinor,
    deliveryCostMinor: order.deliveryCostMinor,
    totalMinor: order.totalMinor,
    items: order.items.map((item) => ({
      sku: item.sku,
      productName: item.productName,
      quantity: item.quantity,
      unitPriceMinor: item.unitPriceMinor,
      lineTotalMinor: item.lineTotalMinor,
    })),
  };
}

export const GET = withRoute("customer", async (ctx) => {
  const id = ctx.url.pathname.split("/").pop() ?? "";
  const services = createOrderServices({
    orders: getOrderRepository(),
    carts: {
      async getCartById() {
        return null;
      },
      async clear() {},
    },
    catalog: {
      async getProductForVariant() {
        return null;
      },
    },
    inventory: {
      async reserveForOrder() {},
      async cancelForOrder() {},
      async commitForOrder() {},
    },
    delivery: {
      async quote() {
        return null;
      },
    },
    clock: { now: () => new Date() },
  });
  const loaded = await services.getOrder(id, ctx.principal);
  return { data: toOrderDto(loaded) };
});
