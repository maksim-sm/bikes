import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
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

describe("order creation against PostgreSQL", () => {
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

  it("persists snapshots, reserves stock, and clears the cart", async () => {
    const inventory = inventoryFor(client);
    const { variantId, sku } = await seedPublishedVariant(client, inventory, 2);
    const { order, cartId } = await placeGuestOrder(client, variantId, 1);
    expect(order.status).toBe("PLACED");
    expect(order.paymentStatus).toBe("PENDING");
    expect(order.number).toMatch(/^B-\d{8}-\d{4}$/);
    expect(order.items).toEqual([
      expect.objectContaining({
        variantId,
        sku,
        quantity: 1,
        unitPriceMinor: 349_900,
        lineTotalMinor: 349_900,
      }),
    ]);
    expect(order.deliveryCostMinor).toBe(2500);
    expect(order.totalMinor).toBe(352_400);

    const stored = await client.order.findUnique({
      where: { id: order.id },
      include: { items: true },
    });
    expect(stored?.number).toBe(order.number);
    expect(stored?.items).toHaveLength(1);
    expect(await inventory.getAvailability(variantId)).toEqual({
      onHand: 2,
      reserved: 1,
      available: 1,
    });
    const cart = await client.cart.findUnique({
      where: { id: cartId },
      include: { items: true },
    });
    expect(cart?.items).toEqual([]);
  });

  it("assigns distinct day-scoped numbers to two checkouts", async () => {
    const inventory = inventoryFor(client);
    const { variantId } = await seedPublishedVariant(client, inventory, 2);
    const first = await placeGuestOrder(client, variantId, 1);
    const second = await placeGuestOrder(client, variantId, 1);
    expect(first.order.number).not.toBe(second.order.number);
    expect(
      (await createOrderStack(client).then((svc) => svc.getPlacedOrder(first.order.id)))
        .id,
    ).toBe(first.order.id);
  });
});
