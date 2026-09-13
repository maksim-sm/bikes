import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { PrismaPg } from "@prisma/adapter-pg";
import { Client } from "pg";
import { PrismaClient } from "../../src/generated/prisma/client";
import type { Product } from "@/modules/catalog";
import { createPrismaCartRepository } from "@/modules/cart";
import { createPrismaDeliveryRepository } from "@/modules/delivery";
import { createMemoryShipments, createDeliveryServices } from "@/modules/delivery";
import { staffPrincipal } from "@/modules/identity";
import { createPrismaInventoryRepository } from "../../src/modules/inventory/infrastructure/prisma-inventory-repository";
import { createInventoryServices, type InventoryServices } from "@/modules/inventory";
import {
  createOrderServices,
  createPrismaOrderRepository,
  orderCartAdapter,
  orderCatalogAdapter,
  orderDeliveryAdapter,
  orderInventoryAdapter,
  type OrderServices,
  type PlaceOrderInput,
} from "@/modules/orders";
import type { CatalogRepository } from "@/modules/catalog";

const execFileAsync = promisify(execFile);

export const TEST_DATABASE_URL =
  process.env["TEST_DATABASE_URL"] ??
  "postgresql://bikes:bikes@localhost:5432/bikes_test";

const ADMIN_DATABASE_URL =
  process.env["TEST_DATABASE_ADMIN_URL"] ??
  "postgresql://bikes:bikes@localhost:5432/postgres";

const clerk = staffPrincipal("inv", ["inventory"]);

const TRUNCATE_SQL = `
TRUNCATE TABLE
  notification_attempts,
  notifications,
  audit_logs,
  payment_events,
  refunds,
  payments,
  inventory_movements,
  inventory_reservations,
  inventory_items,
  deliveries,
  order_items,
  orders,
  cart_items,
  carts,
  wishlist_items,
  wishlists,
  addresses,
  customer_profiles,
  auth_sessions,
  auth_tokens,
  user_staff_roles,
  users,
  variant_media,
  product_media,
  product_variants,
  products,
  brands,
  categories
RESTART IDENTITY CASCADE
`;

export function createTestPrisma(): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: TEST_DATABASE_URL }),
  });
}

export async function ensureTestDatabase(): Promise<void> {
  const admin = new Client({ connectionString: ADMIN_DATABASE_URL });
  await admin.connect();
  const name = new URL(TEST_DATABASE_URL).pathname.replace(/^\//, "");
  const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [
    name,
  ]);
  if (exists.rowCount === 0) {
    await admin.query(`CREATE DATABASE ${name}`);
  }
  await admin.end();
  await execFileAsync("pnpm", ["exec", "prisma", "migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    cwd: process.cwd(),
  });
}

export async function resetTestData(client: PrismaClient): Promise<void> {
  await client.$executeRawUnsafe(TRUNCATE_SQL);
}

export function inventoryFor(client: PrismaClient): InventoryServices {
  return createInventoryServices({
    inventory: createPrismaInventoryRepository(client),
    clock: { now: () => new Date() },
  });
}

function toDomainProduct(row: {
  id: string;
  slug: string;
  name: string;
  description: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  publishedAt: Date | null;
  bicycleType: Product["bicycleType"];
  frameMaterial: string | null;
  groupset: string | null;
  brakeType: string | null;
  modelYear: number | null;
  warrantyMonths: number | null;
  warrantyText: string | null;
  brand: { name: string; slug: string };
  category: { slug: string };
  variants: Array<{
    id: string;
    productId: string;
    sku: string;
    barcode: string | null;
    frameSize: string;
    wheelSize: string;
    color: string;
    listPriceMinor: number;
    currency: string;
    status: "ACTIVE" | "INACTIVE";
    isActive: boolean;
  }>;
}): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    status: row.status,
    publishedAt: row.publishedAt,
    brandName: row.brand.name,
    brandSlug: row.brand.slug,
    categorySlug: row.category.slug,
    bicycleType: row.bicycleType,
    frameMaterial: row.frameMaterial,
    groupset: row.groupset,
    brakeType: row.brakeType,
    modelYear: row.modelYear,
    warrantyMonths: row.warrantyMonths,
    warrantyText: row.warrantyText,
    images: [],
    variants: row.variants.map((variant) => ({
      id: variant.id,
      productId: variant.productId,
      sku: variant.sku,
      barcode: variant.barcode,
      frameSize: variant.frameSize,
      wheelSize: variant.wheelSize,
      color: variant.color,
      listPriceMinor: variant.listPriceMinor,
      currency: "BYN",
      status: variant.status === "ACTIVE" ? "active" : "inactive",
      isActive: variant.isActive,
      images: [],
    })),
  };
}

export function testCatalog(client: PrismaClient): CatalogRepository {
  return {
    async findBySlug() {
      return null;
    },
    async findById(id) {
      const row = await client.product.findUnique({
        where: { id },
        include: { brand: true, category: true, variants: true },
      });
      return row ? toDomainProduct(row) : null;
    },
    async listPublished() {
      return { items: [], total: 0 };
    },
    async listAll() {
      const rows = await client.product.findMany({
        include: { brand: true, category: true, variants: true },
      });
      return rows.map(toDomainProduct);
    },
    async listCategories() {
      return [];
    },
    async listBrands() {
      return [];
    },
    async save() {
      throw new Error("not used in integration harness");
    },
  };
}

export async function seedPublishedVariant(
  client: PrismaClient,
  inventory: InventoryServices,
  onHand: number,
): Promise<{ variantId: string; productId: string; sku: string }> {
  const suffix = crypto.randomUUID().slice(0, 8);
  const brand = await client.brand.create({
    data: { slug: `it-b-${suffix}`, name: "Trek" },
  });
  const category = await client.category.create({
    data: { slug: `it-c-${suffix}`, name: "Шоссе" },
  });
  const product = await client.product.create({
    data: {
      brandId: brand.id,
      categoryId: category.id,
      slug: `it-p-${suffix}`,
      name: "Émonda",
      description: "integration fixture",
      bicycleType: "ROAD",
      status: "PUBLISHED",
      publishedAt: new Date("2026-01-01T00:00:00.000Z"),
    },
  });
  const variant = await client.productVariant.create({
    data: {
      productId: product.id,
      sku: `IT-${suffix}`,
      frameSize: "M",
      wheelSize: "28",
      color: "чёрный",
      listPriceMinor: 349_900,
      status: "ACTIVE",
      isActive: true,
    },
  });
  if (onHand > 0) {
    await inventory.receiveStock(clerk, { variantId: variant.id, quantity: onHand });
  }
  return { variantId: variant.id, productId: product.id, sku: variant.sku };
}

export function checkoutDestination(): PlaceOrderInput["destination"] {
  return {
    recipientName: "Иван",
    phone: "+375291112233",
    region: "Минск",
    city: "Минск",
    street: "Независимости 1",
    postalCode: "220000",
  };
}

export async function createOrderStack(client: PrismaClient): Promise<OrderServices> {
  const carts = await createPrismaCartRepository(client);
  return createOrderServices({
    orders: await createPrismaOrderRepository(client),
    carts: orderCartAdapter(carts),
    catalog: orderCatalogAdapter(testCatalog(client)),
    inventory: orderInventoryAdapter(inventoryFor(client)),
    delivery: orderDeliveryAdapter(
      createDeliveryServices({
        methods: createPrismaDeliveryRepository(client),
        shipments: createMemoryShipments(),
      }),
    ),
    clock: { now: () => new Date() },
  });
}

export async function placeGuestOrder(
  client: PrismaClient,
  variantId: string,
  quantity = 1,
  actorUserId: string | null = null,
): Promise<{ order: Awaited<ReturnType<OrderServices["placeOrder"]>>; cartId: string }> {
  const carts = await createPrismaCartRepository(client);
  const guestToken = `guest-${crypto.randomUUID().slice(0, 8)}`;
  const cart = await carts.create({ kind: "guest", guestToken });
  cart.items = [{ variantId, quantity }];
  await carts.save(cart);
  const orders = await createOrderStack(client);
  const order = await orders.placeOrder({
    cartId: cart.id,
    actorUserId,
    guestToken,
    customerEmail: "ira@example.by",
    customerName: "Ира",
    customerPhone: "+375291112233",
    destination: checkoutDestination(),
    deliveryMethodCode: "minsk-courier",
    paymentMethodCode: "cash_on_delivery",
  });
  return { order, cartId: cart.id };
}
