import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import { findActiveVariant, isListedOnStorefront } from "@/modules/catalog";
import {
  assertCanReadOrder,
  requireOrderManagementRole,
  type Principal,
} from "@/modules/identity";
import { lineTotalMinor } from "@/modules/pricing";
import {
  assertCheckoutCustomer,
  assertCheckoutDestination,
  assertCheckoutPayment,
  checkoutTotals,
} from "../domain/checkout";
import {
  formatOrderNumber,
  paymentEventConfirmsHold,
  paymentEventReleasesReservation,
  paymentEventRequiresHold,
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
  OrderPayments,
  OrderRepository,
  PlaceOrderInput,
} from "./ports";

export interface OrderServices {
  checkout(input: PlaceOrderInput): Promise<Order>;
  placeOrder(input: PlaceOrderInput): Promise<Order>;
  getOrder(id: string, principal: Principal): Promise<Order>;
  getPlacedOrder(id: string): Promise<Order>;
  cancelOrder(id: string, principal: Principal): Promise<Order>;
  completeOrder(id: string, principal: Principal): Promise<Order>;
  applyPaymentEvent(
    id: string,
    event: {
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
    },
  ): Promise<Order>;
  applyFulfillmentEvent(
    id: string,
    principal: Principal,
    event: { type: "assigned" | "shipped" | "delivered" | "failed" | "cancelled" },
  ): Promise<Order>;
}

function mapCheckoutValidation(error: unknown): never {
  if (error instanceof Error && error.message.startsWith("checkout_")) {
    throw new ValidationError(error.message.replaceAll("_", " "));
  }
  throw error;
}

function assertOwnsCart(
  cart: { userId: string | null; guestToken: string | null },
  input: PlaceOrderInput,
): void {
  if (cart.userId) {
    if (input.actorUserId !== cart.userId) {
      throw new ForbiddenError("cart does not belong to the caller");
    }
    return;
  }
  if (!input.guestToken || cart.guestToken !== input.guestToken) {
    throw new ForbiddenError("cart does not belong to the caller");
  }
}

export function createOrderServices(deps: {
  orders: OrderRepository;
  carts: OrderCart;
  catalog: OrderCatalog;
  inventory: OrderInventory;
  delivery: OrderDelivery;
  clock: Clock;
  payments?: OrderPayments;
}): OrderServices {
  async function load(id: string): Promise<Order> {
    const order = await deps.orders.findById(id);
    if (!order) {
      throw new NotFoundError("order not found", { orderId: id });
    }
    return order;
  }

  async function placeOrder(input: PlaceOrderInput): Promise<Order> {
    let customer;
    let destination;
    let paymentMethodCode;
    try {
      customer = assertCheckoutCustomer(input);
      destination = assertCheckoutDestination(input.destination);
      paymentMethodCode = assertCheckoutPayment(input.paymentMethodCode);
    } catch (error) {
      mapCheckoutValidation(error);
    }

    const cart = await deps.carts.getCartById(input.cartId);
    if (!cart || cart.items.length === 0) {
      throw new ValidationError("cart is empty");
    }
    assertOwnsCart(cart, input);

    const quote = await deps.delivery.quote({
      methodCode: input.deliveryMethodCode,
      destination: { region: destination.region, city: destination.city },
      itemCount: cart.items.length,
    });
    if (!quote) {
      throw new ConflictError("delivery method is unavailable for this destination");
    }

    const now = deps.clock.now();
    const lines: OrderLine[] = [];
    for (const item of cart.items) {
      const product = await deps.catalog.getProductForVariant(item.variantId);
      const variant = product ? findActiveVariant(product, item.variantId) : null;
      if (!product || !variant || !isListedOnStorefront(product, now)) {
        throw new ConflictError("variant is not purchasable", {
          variantId: item.variantId,
        });
      }
      const available = await deps.inventory.getAvailable(item.variantId);
      if (available < item.quantity) {
        throw new ConflictError("insufficient available inventory", {
          variantId: item.variantId,
          available,
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

    const totals = checkoutTotals(
      lines.map((line) => line.lineTotalMinor),
      quote.costMinor,
    );
    const sequence = await deps.orders.nextSequence(now);
    const order: Order = {
      id: crypto.randomUUID(),
      number: formatOrderNumber(now, sequence),
      userId: input.actorUserId,
      status: "PLACED",
      paymentStatus: "PENDING",
      fulfillmentStatus: "UNFULFILLED",
      currency: "BYN",
      ...totals,
      deliveryMethodCode: input.deliveryMethodCode,
      deliveryMethodName: quote.methodName,
      customerEmail: customer.customerEmail,
      customerName: customer.customerName,
      customerPhone: customer.customerPhone,
      paymentMethodCode,
      shipping: {
        recipientName: destination.recipientName,
        phone: destination.phone,
        countryCode: "BY",
        region: destination.region,
        city: destination.city,
        street: destination.street,
        postalCode: destination.postalCode,
      },
      items: lines,
    };

    const saved = await deps.orders.save(order);
    try {
      for (const line of saved.items) {
        await deps.inventory.reserveForOrder({
          variantId: line.variantId,
          quantity: line.quantity,
          orderId: saved.id,
        });
      }
    } catch (error) {
      await deps.inventory.cancelForOrder(saved.id);
      await deps.orders.save({ ...saved, status: "CANCELLED" });
      throw error;
    }
    await deps.carts.clear(input.cartId);
    return saved;
  }

  return {
    checkout: placeOrder,
    placeOrder,

    async getOrder(id, principal) {
      const order = await load(id);
      assertCanReadOrder(principal, order.userId, order.id);
      return order;
    },

    async getPlacedOrder(id) {
      return load(id);
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
      const saved = await deps.orders.save(order);
      if (deps.payments) {
        await deps.payments.cancelOpenForOrder(order.id);
      }
      return saved;
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
      if (paymentEventReleasesReservation(event.type)) {
        await deps.inventory.cancelForOrder(order.id);
      }
      if (paymentEventRequiresHold(event.type) && order.status === "PLACED") {
        if (!(await deps.inventory.hasActiveForOrder(order.id))) {
          try {
            for (const line of order.items) {
              await deps.inventory.reserveForOrder({
                variantId: line.variantId,
                quantity: line.quantity,
                orderId: order.id,
              });
            }
          } catch (error) {
            await deps.inventory.cancelForOrder(order.id);
            throw error;
          }
        }
      }
      if (paymentEventConfirmsHold(event.type)) {
        await deps.inventory.confirmForOrder(order.id);
      }
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
