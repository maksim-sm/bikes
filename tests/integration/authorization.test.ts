import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ForbiddenError } from "@/lib/errors";
import { createPrismaCartRepository } from "@/modules/cart";
import {
  createCapturingMailer,
  createPrismaAuthServices,
  customerPrincipal,
  staffPrincipal,
} from "@/modules/identity";
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

async function verifiedCustomer(
  client: PrismaClient,
  email: string,
): Promise<{ userId: string }> {
  const mailer = createCapturingMailer();
  const auth = await createPrismaAuthServices({
    mailer,
    prisma: client,
    cheapHasher: true,
  });
  await auth.register({
    email,
    password: "correct-horse",
    requestId: `reg-${email}`,
    rateKey: `ip:${email}`,
  });
  await auth.verifyEmail({
    rawToken: mailer.verifications[0]!.rawToken,
    requestId: `ver-${email}`,
  });
  const user = await client.user.findUniqueOrThrow({ where: { email } });
  return { userId: user.id };
}

describe("authorization against persisted orders", () => {
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

  it("keeps an owned order to the customer or order-management staff", async () => {
    const owner = await verifiedCustomer(client, "owner@example.by");
    const other = await verifiedCustomer(client, "other@example.by");
    const inventory = inventoryFor(client);
    const { variantId } = await seedPublishedVariant(client, inventory, 1);
    const carts = await createPrismaCartRepository(client);
    const cart = await carts.create({ kind: "customer", userId: owner.userId });
    cart.items = [{ variantId, quantity: 1 }];
    await carts.save(cart);
    const orders = await createOrderStack(client);
    const order = await orders.placeOrder({
      cartId: cart.id,
      actorUserId: owner.userId,
      customerEmail: "owner@example.by",
      customerName: "Оля",
      customerPhone: "+375291112233",
      destination: {
        recipientName: "Оля",
        phone: "+375291112233",
        region: "Минск",
        city: "Минск",
        street: "1",
        postalCode: "220000",
      },
      deliveryMethodCode: "minsk-courier",
      paymentMethodCode: "cash_on_delivery",
    });

    expect((await orders.getOrder(order.id, customerPrincipal(owner.userId))).id).toBe(
      order.id,
    );
    await expect(
      orders.getOrder(order.id, customerPrincipal(other.userId)),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      orders.getOrder(order.id, staffPrincipal("inv", ["inventory"])),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(
      (await orders.getOrder(order.id, staffPrincipal("ops", ["order_management"]))).id,
    ).toBe(order.id);
    await expect(
      orders.listStaffOrders(customerPrincipal(owner.userId)),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(
      (await orders.listStaffOrders(staffPrincipal("mgr", ["manager"]))).map(
        (row) => row.id,
      ),
    ).toEqual([order.id]);
  });

  it("hides a guest order from customers and persists staff titles", async () => {
    const inventory = inventoryFor(client);
    const { variantId } = await seedPublishedVariant(client, inventory, 1);
    const { order } = await placeGuestOrder(client, variantId, 1);
    const orders = await createOrderStack(client);
    const customer = await verifiedCustomer(client, "guest-reader@example.by");
    await expect(
      orders.getOrder(order.id, customerPrincipal(customer.userId)),
    ).rejects.toBeInstanceOf(ForbiddenError);
    expect(
      (await orders.getOrder(order.id, staffPrincipal("ops", ["order_management"])))
        .userId,
    ).toBeNull();

    const mailer = createCapturingMailer();
    const auth = await createPrismaAuthServices({
      mailer,
      prisma: client,
      cheapHasher: true,
    });
    const admin = await client.user.create({
      data: {
        email: "admin@example.by",
        passwordHash: "x",
        role: "STAFF",
        staffRoles: { create: [{ role: "ADMIN" }] },
        emailVerifiedAt: new Date(),
      },
    });
    const clerk = await client.user.create({
      data: {
        email: "clerk@example.by",
        passwordHash: "x",
        role: "STAFF",
        emailVerifiedAt: new Date(),
      },
    });
    await auth.setStaffRoles(staffPrincipal(admin.id, ["admin"]), clerk.id, [
      "inventory",
    ]);
    const assigned = await client.userStaffRole.findMany({
      where: { userId: clerk.id },
    });
    expect(assigned.map((row) => row.role)).toEqual(["INVENTORY"]);
  });
});
