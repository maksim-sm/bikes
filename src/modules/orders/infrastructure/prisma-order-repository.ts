import type { Prisma } from "../../../generated/prisma/client";
import { prisma, type PrismaClient } from "@/lib/db";
import type { Order, OrderLine, OrderShipping, OrderStatus } from "../domain/order";
import type { OrderRepository } from "../application/ports";

function toShipping(row: {
  shippingRecipientName: string;
  shippingPhone: string;
  shippingCountryCode: string;
  shippingRegion: string;
  shippingCity: string;
  shippingStreet: string;
  shippingPostalCode: string;
}): OrderShipping {
  return {
    recipientName: row.shippingRecipientName,
    phone: row.shippingPhone,
    countryCode: "BY",
    region: row.shippingRegion,
    city: row.shippingCity,
    street: row.shippingStreet,
    postalCode: row.shippingPostalCode,
  };
}

function toLine(row: {
  productVariantId: string;
  sku: string;
  productName: string;
  brandName: string;
  frameSize: string;
  color: string;
  quantity: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
}): OrderLine {
  return {
    variantId: row.productVariantId,
    sku: row.sku,
    productName: row.productName,
    brandName: row.brandName,
    frameSize: row.frameSize,
    color: row.color,
    quantity: row.quantity,
    unitPriceMinor: row.unitPriceMinor,
    lineTotalMinor: row.lineTotalMinor,
  };
}

function snapshotOf(order: Order): Record<string, unknown> {
  return {
    number: order.number,
    currency: order.currency,
    subtotalMinor: order.subtotalMinor,
    deliveryCostMinor: order.deliveryCostMinor,
    totalMinor: order.totalMinor,
    deliveryMethodCode: order.deliveryMethodCode,
    deliveryMethodName: order.deliveryMethodName,
    customerEmail: order.customerEmail,
    customerName: order.customerName,
    customerPhone: order.customerPhone,
    shipping: order.shipping,
    items: order.items,
  };
}

export function createPrismaOrderRepository(
  client: PrismaClient = prisma,
): OrderRepository {
  return {
    async nextSequence(day) {
      const start = new Date(
        Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate()),
      );
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      const count = await client.order.count({
        where: { placedAt: { gte: start, lt: end } },
      });
      return count + 1;
    },

    async save(order) {
      const data = {
        number: order.number,
        userId: order.userId,
        status: order.status,
        paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        currency: order.currency,
        subtotalMinor: order.subtotalMinor,
        deliveryCostMinor: order.deliveryCostMinor,
        totalMinor: order.totalMinor,
        deliveryMethodCode: order.deliveryMethodCode,
        deliveryMethodName: order.deliveryMethodName,
        customerEmail: order.customerEmail,
        customerName: order.customerName,
        customerPhone: order.customerPhone,
        shippingRecipientName: order.shipping.recipientName,
        shippingPhone: order.shipping.phone,
        shippingCountryCode: order.shipping.countryCode,
        shippingRegion: order.shipping.region,
        shippingCity: order.shipping.city,
        shippingStreet: order.shipping.street,
        shippingPostalCode: order.shipping.postalCode,
        placedSnapshot: snapshotOf(order) as Prisma.InputJsonValue,
      };
      const existing = await client.order.findUnique({ where: { id: order.id } });
      if (!existing) {
        const created = await client.order.create({
          data: {
            id: order.id,
            ...data,
            items: {
              create: order.items.map((item) => ({
                productVariantId: item.variantId,
                sku: item.sku,
                productName: item.productName,
                brandName: item.brandName,
                frameSize: item.frameSize,
                color: item.color,
                quantity: item.quantity,
                unitPriceMinor: item.unitPriceMinor,
                lineTotalMinor: item.lineTotalMinor,
              })),
            },
          },
          include: { items: true },
        });
        return {
          ...order,
          id: created.id,
          status: created.status as OrderStatus,
        };
      }
      const updated = await client.order.update({
        where: { id: order.id },
        data: {
          status: order.status,
          paymentStatus: order.paymentStatus,
          fulfillmentStatus: order.fulfillmentStatus,
        },
        include: { items: true },
      });
      return {
        ...order,
        status: updated.status as OrderStatus,
        items: updated.items.map(toLine),
        shipping: toShipping(updated),
      };
    },

    async findById(id) {
      const row = await client.order.findUnique({
        where: { id },
        include: { items: { orderBy: { createdAt: "asc" } } },
      });
      if (!row) {
        return null;
      }
      return {
        id: row.id,
        number: row.number,
        userId: row.userId,
        status: row.status as Order["status"],
        paymentStatus: row.paymentStatus as Order["paymentStatus"],
        fulfillmentStatus: row.fulfillmentStatus as Order["fulfillmentStatus"],
        currency: "BYN",
        subtotalMinor: row.subtotalMinor,
        deliveryCostMinor: row.deliveryCostMinor,
        totalMinor: row.totalMinor,
        deliveryMethodCode: row.deliveryMethodCode,
        deliveryMethodName: row.deliveryMethodName,
        customerEmail: row.customerEmail,
        customerName: row.customerName,
        customerPhone: row.customerPhone,
        shipping: toShipping(row),
        items: row.items.map(toLine),
      };
    },
  };
}
