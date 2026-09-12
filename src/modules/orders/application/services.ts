import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import { findActiveVariant } from "@/modules/catalog";
import {
  assertCanReadOrder,
  requireOrderManagementRole,
  type Principal,
} from "@/modules/identity";
import { lineTotalMinor, orderTotalMinor, sumMinor } from "@/modules/pricing";
import {
  formatOrderNumber,
  projectFulfillmentStatus,
  projectPaymentStatus,
  transitionOrder,
  type FulfillmentStatus,
  type Order,
  type OrderLine,
  type PaymentStatus,
} from "../domain/order";
import type {
  Clock,
  OrderCart,
  OrderCatalog,
  OrderDelivery,
  OrderInventory,
  OrderRepository,
  PlaceOrderInput,
} from "./ports";

export interface OrderServices {
  placeOrder(input: PlaceOrderInput): Promise<Order>;
  getOrder(id: string, principal: Principal): Promise<Order>;
  cancelOrder(id: string, principal: Principal): Promise<Order>;
  completeOrder(id: string, principal: Principal): Promise<Order>;
  applyPaymentEvent(
    id: string,
    event: {
      type: "succeeded" | "failed" | "cancelled" | "refunded" | "partially_refunded";
    },
  ): Promise<Order>;
  applyFulfillmentEvent(
    id: string,
    principal: Principal,
    event: { type: "assigned" | "shipped" | "delivered" | "failed" | "cancelled" },
  ): Promise<Order>;
}

export function createOrderServices(deps: {
  orders: OrderRepository;
  carts: OrderCart;
  catalog: OrderCatalog;
  inventory: OrderInventory;
  delivery: OrderDelivery;
  clock: Clock;
}): OrderServices {
  async function load(id: string): Promise<Order> {
    const order = await deps.orders.findById(id);
    if (!order) {
      throw new NotFoundError("order not found", { orderId: id });
    }
    return order;
  }

  return {
    async placeOrder(input) {
      const cart = await deps.carts.getCartById(input.cartId);
      if (!cart || cart.items.length === 0) {
        throw new ValidationError("cart is empty");
      }
      if (input.actorUserId && cart.userId && cart.userId !== input.actorUserId) {
        throw new ForbiddenError("cart does not belong to the caller");
      }

      const quote = await deps.delivery.quote({
        methodCode: input.deliveryMethodCode,
        destination: { region: input.destination.region, city: input.destination.city },
        itemCount: cart.items.length,
      });
      if (!quote) {
        throw new ConflictError("delivery method is unavailable for this destination");
      }

      const lines: OrderLine[] = [];
      for (const item of cart.items) {
        const product = await deps.catalog.getProductForVariant(item.variantId);
        const variant = product ? findActiveVariant(product, item.variantId) : null;
        if (!product || !variant) {
          throw new ConflictError("variant is not purchasable", {
            variantId: item.variantId,
          });
        }
        lines.push({
          variantId: variant.id,
          sku: variant.sku,
          productName: product.name,
          brandName: product.brandName,
          frameSize: variant.frameSize,
          color: variant.color,
          quantity: item.quantity,
          unitPriceMinor: variant.listPriceMinor,
          lineTotalMinor: lineTotalMinor(variant.listPriceMinor, item.quantity),
        });
      }

      const placedAt = deps.clock.now();
      const sequence = await deps.orders.nextSequence(placedAt);
      const subtotalMinor = sumMinor(lines.map((line) => line.lineTotalMinor));
      const order: Order = {
        id: `order-${sequence}`,
        number: formatOrderNumber(placedAt, sequence),
        userId: input.actorUserId,
        status: "PLACED",
        paymentStatus: "PENDING",
        fulfillmentStatus: "UNFULFILLED",
        currency: "BYN",
        subtotalMinor,
        deliveryCostMinor: quote.costMinor,
        totalMinor: orderTotalMinor(subtotalMinor, quote.costMinor),
        items: lines,
      };

      const saved = await deps.orders.save(order);
      for (const line of lines) {
        await deps.inventory.reserveForOrder({
          variantId: line.variantId,
          quantity: line.quantity,
          orderId: saved.id,
        });
      }
      await deps.carts.clear(input.cartId);
      return saved;
    },

    async getOrder(id, principal) {
      const order = await load(id);
      assertCanReadOrder(principal, order.userId, order.id);
      return order;
    },

    async cancelOrder(id, principal) {
      const order = await load(id);
      assertCanReadOrder(principal, order.userId, order.id);
      try {
        order.status = transitionOrder(order.status, "cancel");
      } catch {
        throw new ConflictError("order cannot be cancelled", { orderId: id });
      }
      await deps.inventory.cancelForOrder(order.id);
      return deps.orders.save(order);
    },

    async completeOrder(id, principal) {
      requireOrderManagementRole(principal);
      const order = await load(id);
      try {
        order.status = transitionOrder(order.status, "complete");
      } catch {
        throw new ConflictError("order cannot be completed", { orderId: id });
      }
      await deps.inventory.commitForOrder(order.id);
      return deps.orders.save(order);
    },

    async applyPaymentEvent(id, event) {
      const order = await load(id);
      const paymentStatus: PaymentStatus = projectPaymentStatus(event);
      return deps.orders.save({ ...order, paymentStatus });
    },

    async applyFulfillmentEvent(id, principal, event) {
      requireOrderManagementRole(principal);
      const order = await load(id);
      const fulfillmentStatus: FulfillmentStatus = projectFulfillmentStatus(event);
      return deps.orders.save({ ...order, fulfillmentStatus });
    },
  };
}
