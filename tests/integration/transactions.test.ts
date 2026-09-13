import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import {
  createOrderStack,
  createTestPrisma,
  ensureTestDatabase,
  inventoryFor,
  resetTestData,
  seedPublishedVariant,
} from "./harness";
import { createPrismaCartRepository } from "@/modules/cart";
import type { PrismaClient } from "../../src/generated/prisma/client";

describe("PostgreSQL transactions", () => {
  let client: PrismaClient;

  beforeAll(async () => {
    await ensureTestDatabase();
    client = createTestPrisma();
  }, 60_000);

  afterEach(async () => {
    await resetTestData(client);
  });

  afterAll(async () => {
    await client.$disconnect();
  });

  it("rolls back a Prisma transaction when a later statement fails", async () => {
    const suffix = crypto.randomUUID().slice(0, 8);
    await expect(
      client.$transaction(async (tx) => {
        await tx.brand.create({ data: { slug: `tx-${suffix}`, name: "Rollback" } });
        throw new Error("force_rollback");
      }),
    ).rejects.toThrow("force_rollback");
    expect(await client.brand.findUnique({ where: { slug: `tx-${suffix}` } })).toBeNull();
  });

  it("lets only one of two concurrent checkouts take the last unit", async () => {
    const inventory = inventoryFor(client);
    const { variantId } = await seedPublishedVariant(client, inventory, 1);
    const carts = await createPrismaCartRepository(client);
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
      const cart = await carts.create({ kind: "guest", guestToken });
      cart.items = [{ variantId, quantity: 1 }];
      await carts.save(cart);
      return createOrderStack(client).then((orders) =>
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
    const placed = results.filter((result) => result.status === "fulfilled");
    expect(placed).toHaveLength(1);
    const stock = await inventory.getAvailability(variantId);
    expect(stock.onHand).toBe(1);
    expect(stock.reserved).toBeLessThanOrEqual(1);
    expect(stock.available).toBe(stock.onHand - stock.reserved);
    expect(stock.available).toBeGreaterThanOrEqual(0);
    const rows = await client.order.findMany();
    expect(rows.filter((row) => row.status === "PLACED")).toHaveLength(1);
    expect(
      rows.every((row) => row.status === "PLACED" || row.status === "CANCELLED"),
    ).toBe(true);
  });
});
