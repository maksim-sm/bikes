import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ConflictError } from "@/lib/errors";
import {
  createMemoryPaymentRepository,
  createPaymentServices,
  MockPaymentProvider,
} from "@/modules/payments";
import {
  createTestPrisma,
  ensureTestDatabase,
  inventoryFor,
  resetTestData,
  seedPublishedVariant,
} from "./harness";
import type { InventoryServices, StockSnapshot } from "@/modules/inventory";
import type { PrismaClient } from "../../src/generated/prisma/client";

function assertSafe(stock: StockSnapshot): void {
  expect(stock.available).toBeGreaterThanOrEqual(0);
  expect(stock.reserved).toBeGreaterThanOrEqual(0);
  expect(stock.onHand).toBeGreaterThanOrEqual(0);
  expect(stock.reserved).toBeLessThanOrEqual(stock.onHand);
  expect(stock.available).toBe(stock.onHand - stock.reserved);
}

async function attemptReserve(inventory: InventoryServices, variantId: string) {
  try {
    const hold = await inventory.reserve({ variantId, quantity: 1 });
    return { ok: true as const, hold };
  } catch (error) {
    expect(error).toBeInstanceOf(ConflictError);
    return { ok: false as const };
  }
}

describe("reservation concurrency against PostgreSQL", () => {
  let setup: PrismaClient;
  const extraClients: PrismaClient[] = [];

  function buyer(): InventoryServices {
    const client = createTestPrisma();
    extraClients.push(client);
    return inventoryFor(client);
  }

  beforeAll(async () => {
    await ensureTestDatabase();
    setup = createTestPrisma();
  }, 60_000);

  afterEach(async () => {
    await Promise.all(extraClients.splice(0).map((client) => client.$disconnect()));
    await resetTestData(setup);
  });

  afterAll(async () => {
    await setup.$disconnect();
  });

  it("lets only one of two buyers reserve the last unit", async () => {
    const { variantId } = await seedPublishedVariant(setup, inventoryFor(setup), 1);
    const [first, second] = await Promise.all([
      attemptReserve(buyer(), variantId),
      attemptReserve(buyer(), variantId),
    ]);
    const won = [first, second].filter((result) => result.ok);
    expect(won).toHaveLength(1);
    const stock = await inventoryFor(setup).getAvailability(variantId);
    assertSafe(stock);
    expect(stock).toEqual({ onHand: 1, reserved: 1, available: 0 });
  });

  it("never oversells when many buyers race for one unit", async () => {
    const { variantId } = await seedPublishedVariant(setup, inventoryFor(setup), 1);
    const results = await Promise.all(
      Array.from({ length: 8 }, () => attemptReserve(buyer(), variantId)),
    );
    expect(results.filter((result) => result.ok)).toHaveLength(1);
    const stock = await inventoryFor(setup).getAvailability(variantId);
    assertSafe(stock);
    expect(stock.reserved).toBe(1);
    expect(stock.available).toBe(0);
  });

  it("returns the unit after reservation expiry so the next buyer can take it", async () => {
    const inventory = inventoryFor(setup);
    const { variantId } = await seedPublishedVariant(setup, inventory, 1);
    await inventory.reserve({ variantId, quantity: 1, holdMs: -1 });
    expect(await inventory.expireDue()).toBeGreaterThanOrEqual(1);
    const afterExpiry = await inventory.getAvailability(variantId);
    assertSafe(afterExpiry);
    expect(afterExpiry).toEqual({ onHand: 1, reserved: 0, available: 1 });
    const next = await inventory.reserve({ variantId, quantity: 1 });
    expect(next.status).toBe("ACTIVE");
    assertSafe(await inventory.getAvailability(variantId));
  });

  it("releases the hold when payment fails so another buyer can reserve", async () => {
    const inventory = inventoryFor(setup);
    const { variantId } = await seedPublishedVariant(setup, inventory, 1);
    const hold = await inventory.reserve({ variantId, quantity: 1 });
    const outcomes: string[] = [];
    const payments = createPaymentServices({
      payments: createMemoryPaymentRepository(),
      provider: new MockPaymentProvider(),
      orders: {
        async amountDueMinor() {
          return { amountMinor: 349900, currency: "BYN" };
        },
        async applyEvent(_orderId, event) {
          outcomes.push(event.type);
          if (
            event.type === "failed" ||
            event.type === "expired" ||
            event.type === "cancelled"
          ) {
            try {
              await inventory.cancel(hold.id);
            } catch {
              // already released
            }
          }
        },
      },
    });
    const started = await payments.startPayment(
      "order-fail",
      "https://store.local/return",
    );
    await payments.handleWebhook(
      JSON.stringify({
        paymentId: started.paymentId,
        eventId: "evt-fail",
        type: "failed",
      }),
      { "x-mock-signature": "ok" },
    );
    await payments.handleWebhook(
      JSON.stringify({
        paymentId: started.paymentId,
        eventId: "evt-fail",
        type: "failed",
      }),
      { "x-mock-signature": "ok" },
    );
    expect(outcomes).toEqual(["created", "failed"]);
    try {
      await inventory.cancel(hold.id);
    } catch {
      // already released by the failed payment
    }
    const afterFailure = await inventory.getAvailability(variantId);
    assertSafe(afterFailure);
    expect(afterFailure).toEqual({ onHand: 1, reserved: 0, available: 1 });
    await expect(inventory.commit(hold.id)).rejects.toBeInstanceOf(ConflictError);
    const other = await inventory.reserve({ variantId, quantity: 1 });
    expect(other.status).toBe("ACTIVE");
  });

  it("releases the hold when the order is cancelled", async () => {
    const inventory = inventoryFor(setup);
    const { variantId } = await seedPublishedVariant(setup, inventory, 1);
    const hold = await inventory.reserve({ variantId, quantity: 1 });
    await inventory.cancel(hold.id);
    const stock = await inventory.getAvailability(variantId);
    assertSafe(stock);
    expect(stock).toEqual({ onHand: 1, reserved: 0, available: 1 });
    expect((await inventory.listMovements(variantId)).map((row) => row.type)).toEqual([
      "RECEIPT",
      "RESERVE",
      "RELEASE",
    ]);
  });

  it("commits the unit on successful payment and refuses a second buyer", async () => {
    const inventory = inventoryFor(setup);
    const { variantId } = await seedPublishedVariant(setup, inventory, 1);
    const hold = await inventory.reserve({ variantId, quantity: 1 });
    const outcomes: string[] = [];
    const payments = createPaymentServices({
      payments: createMemoryPaymentRepository(),
      provider: new MockPaymentProvider(),
      orders: {
        async amountDueMinor() {
          return { amountMinor: 349900, currency: "BYN" };
        },
        async applyEvent(_orderId, event) {
          outcomes.push(event.type);
        },
      },
    });
    const started = await payments.startPayment("order-ok", "https://store.local/return");
    await payments.handleWebhook(
      JSON.stringify({
        paymentId: started.paymentId,
        eventId: "evt-ok",
        type: "succeeded",
      }),
      { "x-mock-signature": "ok" },
    );
    expect(outcomes).toEqual(["created", "succeeded"]);
    await inventory.commit(hold.id);
    const sold = await inventory.getAvailability(variantId);
    assertSafe(sold);
    expect(sold).toEqual({ onHand: 0, reserved: 0, available: 0 });
    await expect(inventory.reserve({ variantId, quantity: 1 })).rejects.toBeInstanceOf(
      ConflictError,
    );
    expect((await inventory.listMovements(variantId)).map((row) => row.type)).toContain(
      "COMMIT",
    );
  });
});
