import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ForbiddenError } from "@/lib/errors";
import { customerPrincipal, staffPrincipal } from "@/modules/identity";
import {
  createPaymentServices,
  createPrismaPaymentRepository,
  MockPaymentProvider,
} from "@/modules/payments";
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

describe("payment events and refunds against PostgreSQL", () => {
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

  it("stores the attempt, an idempotent webhook, and a staff refund", async () => {
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
    const created = await client.payment.findFirst({
      where: { providerPaymentId: started.paymentId },
    });
    expect(created?.status).toBe("CREATED");
    expect(created?.orderId).toBe(order.id);
    expect(created?.amountMinor).toBe(order.totalMinor);

    const body = JSON.stringify({
      paymentId: started.paymentId,
      eventId: "evt-paid",
      type: "succeeded",
    });
    const first = await payments.handleWebhook(body, { "x-mock-signature": "ok" });
    const replay = await payments.handleWebhook(body, { "x-mock-signature": "ok" });
    expect(first.status).toBe("SUCCEEDED");
    expect(replay.status).toBe("SUCCEEDED");
    expect(await client.paymentEvent.count()).toBe(1);
    expect((await orders.getPlacedOrder(order.id)).paymentStatus).toBe("SUCCEEDED");
    expect(await inventory.getAvailability(variantId)).toEqual({
      onHand: 1,
      reserved: 1,
      available: 0,
    });

    provider.succeed(started.paymentId);
    await expect(
      payments.refundAsStaff(
        customerPrincipal("cust-1"),
        started.paymentId,
        order.totalMinor,
      ),
    ).rejects.toBeInstanceOf(ForbiddenError);
    const refunded = await payments.refundAsStaff(
      staffPrincipal("ops", ["order_management"]),
      started.paymentId,
      order.totalMinor,
    );
    expect(refunded.status).toBe("REFUNDED");
    expect(
      (
        await client.payment.findFirst({
          where: { providerPaymentId: started.paymentId },
        })
      )?.status,
    ).toBe("REFUNDED");
    expect((await orders.getPlacedOrder(order.id)).paymentStatus).toBe("REFUNDED");
  });
});
