import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ConflictError, ValidationError } from "@/lib/errors";
import { staffPrincipal } from "@/modules/identity";
import { withDeadlockRetry } from "@/lib/db-retry";
import {
  createPaymentServices,
  createPrismaPaymentRepository,
  MockPaymentProvider,
} from "@/modules/payments";
import { createPrismaCartRepository } from "@/modules/cart";
import {
  createOrderStack,
  createTestPrisma,
  ensureTestDatabase,
  inventoryFor,
  placeGuestOrder,
  resetTestData,
  seedPublishedVariant,
} from "./harness";
import type { PrismaClient } from "../../src/generated/prisma/client";

describe("failure modes against PostgreSQL", () => {
  let client: PrismaClient;
  const extra: PrismaClient[] = [];

  beforeAll(async () => {
    await ensureTestDatabase();
    client = createTestPrisma();
  }, 60_000);

  afterEach(async () => {
    await Promise.all(extra.splice(0).map((row) => row.$disconnect()));
    await resetTestData(client);
  });

  afterAll(async () => {
    await client.$disconnect();
  });

  it("retries a real deadlock until both sessions finish", async () => {
    const inventory = inventoryFor(client);
    const first = await seedPublishedVariant(client, inventory, 2);
    const second = await seedPublishedVariant(client, inventory, 2);
    const itemA = await client.inventoryItem.findUniqueOrThrow({
      where: { variantId: first.variantId },
    });
    const itemB = await client.inventoryItem.findUniqueOrThrow({
      where: { variantId: second.variantId },
    });

    async function lockPair(left: string, right: string): Promise<void> {
      const session = createTestPrisma();
      extra.push(session);
      await withDeadlockRetry(() =>
        session.$transaction(async (tx) => {
          await tx.$executeRaw`
            SELECT id FROM inventory_items WHERE id = ${left}::uuid FOR UPDATE
          `;
          await new Promise((resolve) => setTimeout(resolve, 80));
          await tx.$executeRaw`
            SELECT id FROM inventory_items WHERE id = ${right}::uuid FOR UPDATE
          `;
        }),
      );
    }

    await Promise.all([lockPair(itemA.id, itemB.id), lockPair(itemB.id, itemA.id)]);
    expect(
      await client.inventoryItem.count({
        where: { id: { in: [itemA.id, itemB.id] } },
      }),
    ).toBe(2);
  });

  it("double-click checkout on one cart places a single order", async () => {
    const inventory = inventoryFor(client);
    const { variantId } = await seedPublishedVariant(client, inventory, 4);
    const carts = await createPrismaCartRepository(client);
    const guestToken = `guest-${crypto.randomUUID().slice(0, 8)}`;
    const cart = await carts.create({ kind: "guest", guestToken });
    cart.items = [{ variantId, quantity: 1 }];
    await carts.save(cart);
    const destination = {
      recipientName: "Ира",
      phone: "+375291112233",
      region: "Минск",
      city: "Минск",
      street: "1",
      postalCode: "220000",
    };
    async function checkout() {
      const session = createTestPrisma();
      extra.push(session);
      const orders = await createOrderStack(session);
      return orders.placeOrder({
        cartId: cart.id,
        actorUserId: null,
        guestToken,
        customerEmail: "ira@example.by",
        customerName: "Ира",
        customerPhone: "+375291112233",
        destination,
        deliveryMethodCode: "minsk-courier",
        paymentMethodCode: "cash_on_delivery",
      });
    }
    const results = await Promise.allSettled([checkout(), checkout()]);
    const placed = results.filter((result) => result.status === "fulfilled");
    expect(placed).toHaveLength(1);
    const rejected = results.find((result) => result.status === "rejected");
    expect(rejected?.status).toBe("rejected");
    if (rejected?.status === "rejected") {
      expect(rejected.reason).toBeInstanceOf(ValidationError);
    }
    expect(await client.order.count({ where: { status: "PLACED" } })).toBe(1);
  });

  it("only one of two buyers checks out the last bicycle", async () => {
    const inventory = inventoryFor(client);
    const { variantId } = await seedPublishedVariant(client, inventory, 1);
    const destination = {
      recipientName: "Ира",
      phone: "+375291112233",
      region: "Минск",
      city: "Минск",
      street: "1",
      postalCode: "220000",
    };
    async function checkout() {
      const guestToken = `guest-${crypto.randomUUID().slice(0, 8)}`;
      const session = createTestPrisma();
      extra.push(session);
      const sessionCarts = await createPrismaCartRepository(session);
      const cart = await sessionCarts.create({ kind: "guest", guestToken });
      cart.items = [{ variantId, quantity: 1 }];
      await sessionCarts.save(cart);
      return createOrderStack(session).then((orders) =>
        orders.placeOrder({
          cartId: cart.id,
          actorUserId: null,
          guestToken,
          customerEmail: "ira@example.by",
          customerName: "Ира",
          customerPhone: "+375291112233",
          destination,
          deliveryMethodCode: "minsk-courier",
          paymentMethodCode: "cash_on_delivery",
        }),
      );
    }
    const results = await Promise.allSettled([checkout(), checkout()]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.some((result) => result.status === "rejected")).toBe(true);
    const stock = await inventory.getAvailability(variantId);
    expect(stock).toEqual({ onHand: 1, reserved: 1, available: 0 });
    expect(await client.order.count({ where: { status: "PLACED" } })).toBe(1);
  });

  it("duplicate webhook and a repeated refund stay idempotent", async () => {
    const inventory = inventoryFor(client);
    const { variantId } = await seedPublishedVariant(client, inventory, 1);
    const { order } = await placeGuestOrder(client, variantId, 1);
    const orders = await createOrderStack(client);
    const provider = new MockPaymentProvider();
    const payments = createPaymentServices({
      payments: createPrismaPaymentRepository(client),
      provider,
      orders: {
        async amountDueMinor(orderId) {
          const row = await orders.getPlacedOrder(orderId);
          return { amountMinor: row.totalMinor, currency: "BYN" };
        },
        async applyEvent(orderId, event) {
          await orders.applyPaymentEvent(orderId, event);
        },
      },
    });
    const started = await payments.startPayment(order.id, "https://store.local/return");
    const body = JSON.stringify({
      paymentId: started.paymentId,
      eventId: "evt-dup-it",
      type: "succeeded",
    });
    expect(
      (await payments.handleWebhook(body, { "x-mock-signature": "ok" })).status,
    ).toBe("SUCCEEDED");
    expect(
      (await payments.handleWebhook(body, { "x-mock-signature": "ok" })).status,
    ).toBe("SUCCEEDED");
    expect(await client.paymentEvent.count()).toBe(1);
    provider.succeed(started.paymentId);
    const staff = staffPrincipal("ops", ["order_management"]);
    expect(
      (await payments.refundAsStaff(staff, started.paymentId, order.totalMinor)).status,
    ).toBe("REFUNDED");
    await expect(
      payments.refundAsStaff(staff, started.paymentId, order.totalMinor),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("cancellation during payment ignores a late success webhook", async () => {
    const inventory = inventoryFor(client);
    const { variantId } = await seedPublishedVariant(client, inventory, 1);
    const { order } = await placeGuestOrder(client, variantId, 1, null);
    const orders = await createOrderStack(client);
    const provider = new MockPaymentProvider();
    const payments = createPaymentServices({
      payments: createPrismaPaymentRepository(client),
      provider,
      orders: {
        async amountDueMinor(orderId) {
          const row = await orders.getPlacedOrder(orderId);
          return { amountMinor: row.totalMinor, currency: "BYN" };
        },
        async applyEvent(orderId, event) {
          await orders.applyPaymentEvent(orderId, event);
        },
      },
    });
    const started = await payments.startPayment(order.id, "https://store.local/return");
    await orders.cancelOrder(order.id, staffPrincipal("ops", ["order_management"]));
    await payments.cancelOpenForOrder(order.id);
    const late = await payments.handleWebhook(
      JSON.stringify({
        paymentId: started.paymentId,
        eventId: "evt-late-cancel",
        type: "succeeded",
      }),
      { "x-mock-signature": "ok" },
    );
    expect(late.status).toBe("CANCELLED");
    expect((await orders.getPlacedOrder(order.id)).status).toBe("CANCELLED");
    expect(await inventory.getAvailability(variantId)).toEqual({
      onHand: 1,
      reserved: 0,
      available: 1,
    });
  });
});
