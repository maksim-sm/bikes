import { describe, expect, it } from "vitest";
import { ConflictError, ValidationError } from "@/lib/errors";
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
import { createMemoryCartRepository } from "@/modules/cart";
import type { Product } from "@/modules/catalog";
import { orderCartAdapter } from "./adapters";
import { createOrderServices } from "./services";
import { createMemoryOrderRepository } from "../infrastructure/memory-order-repository";
import type { PlaceOrderInput } from "./ports";

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

function placeInput(cartId: string): PlaceOrderInput {
  return {
    cartId,
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
    paymentMethodCode: "bank_transfer",
  };
}

async function seededCart() {
  const carts = createMemoryCartRepository();
  const cart = await carts.create({ kind: "customer", userId: "user-1" });
  cart.items = [{ variantId: "v1", quantity: 1 }];
  await carts.save(cart);
  return { carts, cart };
}

function commerce(onHand: number, carts: ReturnType<typeof createMemoryCartRepository>) {
  const clock = { now: () => new Date("2026-09-12T10:00:00.000Z") };
  const inventory = createInventoryServices({
    inventory: createMemoryInventoryRepository([
      { id: "i1", variantId: "v1", onHand, reserved: 0 },
    ]),
    clock,
  });
  const orders = createMemoryOrderRepository();
  const provider = new MockPaymentProvider();
  const orderServices = createOrderServices({
    orders,
    carts: orderCartAdapter(carts),
    catalog: {
      async getProductForVariant() {
        return product;
      },
    },
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
    delivery: {
      async quote() {
        return { costMinor: 0, methodName: "Самовывоз" };
      },
    },
    clock,
    payments: {
      cancelOpenForOrder: (orderId) => payments.cancelOpenForOrder(orderId),
    },
  });
  const payments = createPaymentServices({
    payments: createMemoryPaymentRepository(),
    provider,
    clock,
    orders: {
      async amountDueMinor(orderId) {
        const row = await orders.findById(orderId);
        if (!row) {
          throw new Error("missing order");
        }
        return { amountMinor: row.totalMinor, currency: "BYN" };
      },
      async applyEvent(orderId, event) {
        await orderServices.applyPaymentEvent(orderId, event);
      },
    },
  });
  return { inventory, orderServices, payments, provider };
}

describe("checkout and payment failure modes", () => {
  it("double-click checkout: second claim finds an empty cart", async () => {
    const { carts, cart } = await seededCart();
    const { orderServices } = commerce(4, carts);
    const first = await orderServices.placeOrder(placeInput(cart.id));
    expect(first.status).toBe("PLACED");
    await expect(orderServices.placeOrder(placeInput(cart.id))).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(await carts.findById(cart.id)).toMatchObject({ items: [] });
  });

  it("concurrent double-click checkout places exactly one order", async () => {
    const { carts, cart } = await seededCart();
    const { orderServices } = commerce(4, carts);
    const results = await Promise.allSettled([
      orderServices.placeOrder(placeInput(cart.id)),
      orderServices.placeOrder(placeInput(cart.id)),
    ]);
    const placed = results.filter((result) => result.status === "fulfilled");
    const rejected = results.filter((result) => result.status === "rejected");
    expect(placed).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0]).toMatchObject({ status: "rejected" });
    if (rejected[0]?.status === "rejected") {
      expect(rejected[0].reason).toBeInstanceOf(ValidationError);
    }
  });

  it("concurrent purchase of the last bicycle: one order, one hold", async () => {
    const first = await seededCart();
    const secondCarts = createMemoryCartRepository();
    const second = await secondCarts.create({ kind: "customer", userId: "user-2" });
    second.items = [{ variantId: "v1", quantity: 1 }];
    await secondCarts.save(second);

    const clock = { now: () => new Date("2026-09-12T10:00:00.000Z") };
    const inventory = createInventoryServices({
      inventory: createMemoryInventoryRepository([
        { id: "i1", variantId: "v1", onHand: 1, reserved: 0 },
      ]),
      clock,
    });
    function stack(carts: ReturnType<typeof createMemoryCartRepository>) {
      return createOrderServices({
        orders: createMemoryOrderRepository(),
        carts: orderCartAdapter(carts),
        catalog: {
          async getProductForVariant() {
            return product;
          },
        },
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
        delivery: {
          async quote() {
            return { costMinor: 0, methodName: "Самовывоз" };
          },
        },
        clock,
      });
    }
    const results = await Promise.allSettled([
      stack(first.carts).placeOrder(placeInput(first.cart.id)),
      stack(secondCarts).placeOrder({
        ...placeInput(second.id),
        actorUserId: "user-2",
      }),
    ]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    const failed = results.find((result) => result.status === "rejected");
    expect(failed?.status).toBe("rejected");
    if (failed?.status === "rejected") {
      expect(failed.reason).toBeInstanceOf(ConflictError);
    }
    expect(await inventory.getAvailability("v1")).toEqual({
      onHand: 1,
      reserved: 1,
      available: 0,
    });
  });

  it("cancellation during payment voids the attempt; a late success webhook is ignored", async () => {
    const { carts, cart } = await seededCart();
    const { orderServices, payments, inventory } = commerce(1, carts);
    const order = await orderServices.placeOrder(placeInput(cart.id));
    const started = await payments.startPayment(order.id, "https://store.local/return");
    const cancelled = await orderServices.cancelOrder(
      order.id,
      customerPrincipal("user-1"),
    );
    expect(cancelled.status).toBe("CANCELLED");
    const late = await payments.handleWebhook(
      JSON.stringify({
        paymentId: started.paymentId,
        eventId: "evt-after-cancel",
        type: "succeeded",
      }),
      { "x-mock-signature": "ok" },
    );
    expect(late.status).toBe("CANCELLED");
    expect(await inventory.getAvailability("v1")).toEqual({
      onHand: 1,
      reserved: 0,
      available: 1,
    });
    expect((await orderServices.getPlacedOrder(order.id)).paymentStatus).not.toBe(
      "SUCCEEDED",
    );
  });

  it("restores the cart when reservation fails after the claim", async () => {
    const { carts, cart } = await seededCart();
    const { orderServices } = commerce(0, carts);
    await expect(orderServices.placeOrder(placeInput(cart.id))).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect((await carts.findById(cart.id))?.items).toEqual([
      { variantId: "v1", quantity: 1 },
    ]);
  });
});
