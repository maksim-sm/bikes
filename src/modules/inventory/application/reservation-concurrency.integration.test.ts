import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { PrismaPg } from "@prisma/adapter-pg";
import { Client } from "pg";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { PrismaClient } from "../../../generated/prisma/client";
import { ConflictError } from "@/lib/errors";
import { staffPrincipal } from "@/modules/identity";
import {
  createMemoryPaymentRepository,
  createPaymentServices,
  MockPaymentProvider,
} from "@/modules/payments";
import { createPrismaInventoryRepository } from "../infrastructure/prisma-inventory-repository";
import {
  createInventoryServices,
  type InventoryServices,
  type StockSnapshot,
} from "./services";

const execFileAsync = promisify(execFile);
const TEST_DATABASE_URL = "postgresql://bikes:bikes@localhost:5432/bikes_test";
const clerk = staffPrincipal("inv", ["inventory"]);

function assertSafe(stock: StockSnapshot): void {
  expect(stock.available).toBeGreaterThanOrEqual(0);
  expect(stock.reserved).toBeGreaterThanOrEqual(0);
  expect(stock.onHand).toBeGreaterThanOrEqual(0);
  expect(stock.reserved).toBeLessThanOrEqual(stock.onHand);
  expect(stock.available).toBe(stock.onHand - stock.reserved);
}

function createClient(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: TEST_DATABASE_URL }),
  });
}

function inventoryFor(client: PrismaClient): InventoryServices {
  return createInventoryServices({
    inventory: createPrismaInventoryRepository(client),
    clock: { now: () => new Date() },
  });
}

async function ensureTestDatabase(): Promise<void> {
  const admin = new Client({
    connectionString: "postgresql://bikes:bikes@localhost:5432/postgres",
  });
  await admin.connect();
  const found = await admin.query(
    "SELECT 1 FROM pg_database WHERE datname = 'bikes_test'",
  );
  if (found.rowCount === 0) {
    await admin.query("CREATE DATABASE bikes_test");
  }
  await admin.end();
  await execFileAsync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    cwd: process.cwd(),
  });
}

async function seedVariant(
  client: PrismaClient,
  inventory: InventoryServices,
  onHand: number,
): Promise<string> {
  const suffix = crypto.randomUUID().slice(0, 8);
  const brand = await client.brand.create({
    data: { slug: `conc-b-${suffix}`, name: "Trek" },
  });
  const category = await client.category.create({
    data: { slug: `conc-c-${suffix}`, name: "Шоссе" },
  });
  const product = await client.product.create({
    data: {
      brandId: brand.id,
      categoryId: category.id,
      slug: `conc-p-${suffix}`,
      name: "Émonda",
      description: "concurrency fixture",
      bicycleType: "ROAD",
    },
  });
  const variant = await client.productVariant.create({
    data: {
      productId: product.id,
      sku: `CONC-${suffix}`,
      frameSize: "M",
      wheelSize: "28",
      color: "чёрный",
      listPriceMinor: 349900,
    },
  });
  if (onHand > 0) {
    await inventory.receiveStock(clerk, { variantId: variant.id, quantity: onHand });
  }
  return variant.id;
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
    const client = createClient();
    extraClients.push(client);
    return inventoryFor(client);
  }

  beforeAll(async () => {
    await ensureTestDatabase();
    setup = createClient();
  }, 60_000);

  afterEach(async () => {
    await Promise.all(extraClients.splice(0).map((client) => client.$disconnect()));
  });

  afterAll(async () => {
    await setup.$disconnect();
  });

  it("lets only one of two buyers reserve the last unit", async () => {
    const variantId = await seedVariant(setup, inventoryFor(setup), 1);
    const left = buyer();
    const right = buyer();
    const [first, second] = await Promise.all([
      attemptReserve(left, variantId),
      attemptReserve(right, variantId),
    ]);
    const won = [first, second].filter((result) => result.ok);
    expect(won).toHaveLength(1);
    const stock = await inventoryFor(setup).getAvailability(variantId);
    assertSafe(stock);
    expect(stock).toEqual({ onHand: 1, reserved: 1, available: 0 });
  });

  it("never oversells when many buyers race for one unit", async () => {
    const variantId = await seedVariant(setup, inventoryFor(setup), 1);
    const buyers = Array.from({ length: 8 }, () => buyer());
    const results = await Promise.all(
      buyers.map((buyer) => attemptReserve(buyer, variantId)),
    );
    const won = results.filter((result) => result.ok);
    expect(won).toHaveLength(1);
    expect(won.length).toBeLessThanOrEqual(1);
    const stock = await inventoryFor(setup).getAvailability(variantId);
    assertSafe(stock);
    expect(stock.reserved).toBe(1);
    expect(stock.available).toBe(0);
  });

  it("returns the unit after reservation expiry so the next buyer can take it", async () => {
    const inventory = inventoryFor(setup);
    const variantId = await seedVariant(setup, inventory, 1);
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
    const variantId = await seedVariant(setup, inventory, 1);
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
    expect(outcomes).toEqual(["created", "failed"]);
    await inventory.cancel(hold.id);
    const afterFailure = await inventory.getAvailability(variantId);
    assertSafe(afterFailure);
    expect(afterFailure).toEqual({ onHand: 1, reserved: 0, available: 1 });
    await expect(inventory.commit(hold.id)).rejects.toBeInstanceOf(ConflictError);
    const other = await inventory.reserve({ variantId, quantity: 1 });
    expect(other.status).toBe("ACTIVE");
  });

  it("releases the hold when the order is cancelled", async () => {
    const inventory = inventoryFor(setup);
    const variantId = await seedVariant(setup, inventory, 1);
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
    const variantId = await seedVariant(setup, inventory, 1);
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
