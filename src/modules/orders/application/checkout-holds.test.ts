import { describe, expect, it } from "vitest";
import { ConflictError } from "@/lib/errors";
import { customerPrincipal } from "@/modules/identity";
import {
  createInventoryServices,
  createMemoryInventoryRepository,
} from "@/modules/inventory";
import {
  createMemoryPaymentRepository,
  createPaymentServices,
  MockPaymentProvider,
} from "@/modules/payments";
import type { Cart } from "@/modules/cart";
import type { Product } from "@/modules/catalog";
import { createCheckoutHoldReconciler } from "./checkout-holds";
import type {
  OrderCart,
  OrderCatalog,
  OrderDelivery,
  OrderRepository,
  PlaceOrderInput,
} from "./ports";
import { createOrderServices } from "./services";
import type { Order } from "../domain/order";

const product: Product = {
  id: "p1",
  slug: "emonda",
  name: "Émonda",
  description: "x",
  status: "PUBLISHED",
  publishedAt: new Date("2026-01-01T00:00:00.000Z"),
  brandName: "Trek",
  brandSlug: "trek",
  categorySlug: "road",
  bicycleType: "ROAD",
  frameMaterial: null,
  groupset: null,
  brakeType: null,
  modelYear: null,
  warrantyMonths: null,
  warrantyText: null,
  images: [],
  variants: [
    {
      id: "v1",
      productId: "p1",
      sku: "EM-M",
      barcode: null,
      frameSize: "M",
      wheelSize: "28",
      color: "чёрный",
      listPriceMinor: 349900,
      currency: "BYN",
      status: "active",
      isActive: true,
      images: [],
    },
  ],
};

function placeInput(): PlaceOrderInput {
  return {
    cartId: "c1",
    actorUserId: "user-1",
    customerEmail: "a@b.by",
    customerName: "Иван",
    customerPhone: "+375291112233",
    destination: {
      recipientName: "Иван",
      phone: "+375291112233",
      region: "Минск",
      city: "Минск",
      street: "Независимости 1",
      postalCode: "220000",
    },
    deliveryMethodCode: "minsk-courier",
    paymentMethodCode: "cash_on_delivery",
  };
}

function stack(options?: { now?: Date; holdMs?: number }) {
  let now = options?.now ?? new Date("2026-09-12T10:00:00.000Z");
  const clock = { now: () => now };
  const inventory = createInventoryServices({
    inventory: createMemoryInventoryRepository([
      { id: "i1", variantId: "v1", onHand: 1, reserved: 0 },
    ]),
    clock,
  });
  const originalReserve = inventory.reserve.bind(inventory);
  if (options?.holdMs !== undefined) {
    const holdMs = options.holdMs;
    inventory.reserve = async (input) => originalReserve({ ...input, holdMs });
  }

  const orders = new Map<string, Order>();
  const orderRepo: OrderRepository = {
    async nextSequence() {
      return 1;
    },
    async save(order) {
      orders.set(order.id, order);
      return order;
    },
    async findById(id) {
      return orders.get(id) ?? null;
    },
    async listByUser(userId) {
      return [...orders.values()].filter((order) => order.userId === userId);
    },
    async listForStaff() {
      return [...orders.values()];
    },
  };
  const cart: Cart = {
    id: "c1",
    userId: "user-1",
    guestToken: null,
    items: [{ variantId: "v1", quantity: 1 }],
  };
  const carts: OrderCart = {
    async getCartById() {
      return cart;
    },
    async clear() {
      cart.items = [];
    },
  };
  const catalog: OrderCatalog = {
    async getProductForVariant() {
      return product;
    },
  };
  const delivery: OrderDelivery = {
    async quote() {
      return { costMinor: 0, methodName: "Самовывоз" };
    },
  };
  const provider = new MockPaymentProvider();
  const payments = createPaymentServices({
    payments: createMemoryPaymentRepository(),
    provider,
    clock,
    orders: {
      async amountDueMinor(orderId) {
        const order = orders.get(orderId);
        if (!order) {
          throw new Error("missing order");
        }
        return { amountMinor: order.totalMinor, currency: "BYN" };
      },
      async applyEvent(orderId, event) {
        await orderServices.applyPaymentEvent(orderId, event);
      },
    },
  });
  const orderServices = createOrderServices({
    orders: orderRepo,
    carts,
    catalog,
    inventory: {
      async getAvailable(variantId) {
        return (await inventory.getAvailability(variantId)).available;
      },
      async reserveForOrder(input) {
        await inventory.reserve(input);
      },
      async hasActiveForOrder(orderId) {
        return inventory.hasActiveForOrder(orderId);
      },
      async confirmForOrder(orderId) {
        await inventory.confirmForOrder(orderId);
      },
      async cancelForOrder(orderId) {
        await inventory.cancelForOrder(orderId);
      },
      async commitForOrder(orderId) {
        await inventory.commitForOrder(orderId);
      },
    },
    delivery,
    clock,
    payments: {
      cancelOpenForOrder: (orderId) => payments.cancelOpenForOrder(orderId),
    },
  });
  const reconciler = createCheckoutHoldReconciler({ inventory, payments });
  return {
    inventory,
    payments,
    provider,
    orderServices,
    reconciler,
    advance(ms: number) {
      now = new Date(now.getTime() + ms);
    },
  };
}

async function failPayment(
  payments: ReturnType<typeof createPaymentServices>,
  paymentId: string,
  eventId: string,
) {
  const body = JSON.stringify({ paymentId, eventId, type: "failed" });
  return payments.handleWebhook(body, { "x-mock-signature": "ok" });
}

describe("checkout hold reconciliation", () => {
  it("releases reservations exactly once when payment fails, including replay", async () => {
    const { inventory, payments, orderServices } = stack();
    const order = await orderServices.checkout(placeInput());
    expect(await inventory.getAvailability("v1")).toEqual({
      onHand: 1,
      reserved: 1,
      available: 0,
    });
    const started = await payments.startPayment(order.id, "https://store.local/return");
    const first = await failPayment(payments, started.paymentId, "evt-fail");
    const replay = await failPayment(payments, started.paymentId, "evt-fail");
    expect(first.status).toBe("FAILED");
    expect(replay.status).toBe("FAILED");
    expect(await inventory.getAvailability("v1")).toEqual({
      onHand: 1,
      reserved: 0,
      available: 1,
    });
    expect((await inventory.listMovements("v1")).map((row) => row.type)).toEqual([
      "RESERVE",
      "RELEASE",
    ]);
    await inventory.expireDue();
    await payments.expireDue();
    expect(await inventory.getAvailability("v1")).toEqual({
      onHand: 1,
      reserved: 0,
      available: 1,
    });
    expect((await inventory.listMovements("v1")).map((row) => row.type)).toEqual([
      "RESERVE",
      "RELEASE",
    ]);
    const other = await inventory.reserve({ variantId: "v1", quantity: 1 });
    expect(other.status).toBe("ACTIVE");
  });

  it("expires a timed-out payment and frees the hold once", async () => {
    const { inventory, payments, orderServices, advance } = stack();
    const order = await orderServices.checkout(placeInput());
    const started = await payments.startPayment(order.id, "https://store.local/return");
    advance(16 * 60 * 1000);
    expect(await payments.expireDue()).toBe(1);
    expect(await payments.expireDue()).toBe(0);
    expect(await payments.getPaymentStatus(started.paymentId)).toBe("EXPIRED");
    expect(await inventory.getAvailability("v1")).toEqual({
      onHand: 1,
      reserved: 0,
      available: 1,
    });
    expect(
      (await inventory.listMovements("v1")).filter((row) => row.type !== "RESERVE"),
    ).toEqual([expect.objectContaining({ type: "RELEASE" })]);
  });

  it("treats abandoned checkout (expired reservation) as a single release", async () => {
    const { inventory, payments, orderServices, reconciler } = stack({ holdMs: -1 });
    const order = await orderServices.checkout(placeInput());
    const started = await payments.startPayment(order.id, "https://store.local/return");
    const first = await reconciler.reconcile();
    const second = await reconciler.reconcile();
    expect(first.expiredReservations).toBe(1);
    expect(first.abandonedPayments).toBe(1);
    expect(second.expiredReservations).toBe(0);
    expect(second.abandonedPayments).toBe(0);
    expect(await payments.getPaymentStatus(started.paymentId)).toBe("EXPIRED");
    expect(await inventory.getAvailability("v1")).toEqual({
      onHand: 1,
      reserved: 0,
      available: 1,
    });
    expect((await inventory.listMovements("v1")).map((row) => row.type)).toEqual([
      "RESERVE",
      "EXPIRE",
    ]);
  });

  it("cancels an open payment and releases the hold once", async () => {
    const { inventory, payments, orderServices } = stack();
    const order = await orderServices.checkout(placeInput());
    const started = await payments.startPayment(order.id, "https://store.local/return");
    await orderServices.cancelOrder(order.id, customerPrincipal("user-1"));
    expect(await payments.getPaymentStatus(started.paymentId)).toBe("CANCELLED");
    expect(await inventory.getAvailability("v1")).toEqual({
      onHand: 1,
      reserved: 0,
      available: 1,
    });
    await payments.expireOpenForOrders([order.id]);
    await inventory.cancelForOrder(order.id);
    expect((await inventory.listMovements("v1")).map((row) => row.type)).toEqual([
      "RESERVE",
      "RELEASE",
    ]);
  });

  it("re-reserves on payment retry after failure", async () => {
    const { inventory, payments, orderServices } = stack();
    const order = await orderServices.checkout(placeInput());
    const first = await payments.startPayment(order.id, "https://store.local/return");
    await failPayment(payments, first.paymentId, "evt-fail");
    expect(await inventory.getAvailability("v1")).toEqual({
      onHand: 1,
      reserved: 0,
      available: 1,
    });
    const retry = await payments.startPayment(order.id, "https://store.local/return");
    expect(retry.paymentId).not.toBe(first.paymentId);
    expect(await inventory.getAvailability("v1")).toEqual({
      onHand: 1,
      reserved: 1,
      available: 0,
    });
    await expect(
      inventory.reserve({ variantId: "v1", quantity: 1 }),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
