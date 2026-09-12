import type {
  CatalogInventory,
  CatalogListQuery,
  CatalogRepository,
} from "@/modules/catalog";
import {
  catalogMediaReferences,
  createCatalogAdminServices,
  createCatalogServices,
  createDemoCatalogRepository,
  createPrismaCatalogRepository,
  type CatalogAdminServices,
  type CatalogServices,
} from "@/modules/catalog";
import {
  createCartServices,
  createMemoryCartRepository,
  createPrismaCartRepository,
  type CartCatalog,
  type CartRepository,
  type CartServices,
  type CartVariantSnapshot,
} from "@/modules/cart";
import { isListedOnStorefront, isSellableVariant } from "@/modules/catalog";
import { createPricingServices } from "@/modules/pricing";
import {
  createDemoDeliveryRepository,
  createDeliveryServices,
  createMemoryShipments,
  type DeliveryServices,
} from "@/modules/delivery";
import {
  createInventoryServices,
  createMemoryInventoryRepository,
  createPrismaCatalogInventory,
  createPrismaInventoryRepository,
  type InventoryItem,
  type InventoryServices,
} from "@/modules/inventory";
import {
  createCustomerServices,
  createDemoAuthServices,
  createMemoryAuthServices,
  createMemoryCustomerRepository,
  createMemoryWishlistRepository,
  createWishlistServices,
  type AuthServices,
  type CustomerRepository,
  type CustomerServices,
  type WishlistCatalog,
  type WishlistRepository,
  type WishlistServices,
} from "@/modules/identity";
import {
  createMemoryOrderRepository,
  createOrderServices,
  createPrismaOrderRepository,
  orderCartAdapter,
  orderCatalogAdapter,
  orderDeliveryAdapter,
  orderInventoryAdapter,
  type OrderRepository,
  type OrderServices,
} from "@/modules/orders";
import type { PaymentOrder, PaymentRepository } from "@/modules/payments";
import { createPaymentServices, MockPaymentProvider } from "@/modules/payments";
import {
  createFilesystemMediaStore,
  createMediaServices,
  createMemoryMediaReferences,
  createMemoryMediaRepository,
  createMemoryMediaStore,
  createPrismaMediaRepository,
  type MediaServices,
} from "@/modules/media";

export const emptyCatalog: CatalogRepository = {
  async findBySlug() {
    return null;
  },
  async findById() {
    return null;
  },
  async listPublished(_query: CatalogListQuery) {
    return { items: [], total: 0 };
  },
  async listAll() {
    return [];
  },
  async save(product) {
    return product;
  },
  async listCategories() {
    return [];
  },
  async listBrands() {
    return [];
  },
};

const emptyInventory: CatalogInventory = {
  async listInStockVariantIds() {
    return [];
  },
  async listAvailabilityByVariantIds() {
    return [];
  },
};

export const emptyOrders: OrderRepository = {
  async nextSequence() {
    return 1;
  },
  async save(order) {
    return order;
  },
  async findById() {
    return null;
  },
};

const emptyPayments: PaymentRepository = {
  async listByOrder() {
    return [];
  },
  async save(payment) {
    return payment;
  },
  async findById() {
    return null;
  },
  async findByProviderPaymentId() {
    return null;
  },
  async findEvent() {
    return null;
  },
  async saveEvent(event) {
    return event;
  },
};

const emptyPaymentOrders: PaymentOrder = {
  async amountDueMinor() {
    return { amountMinor: 0, currency: "BYN" };
  },
  async applyEvent() {},
};

let catalogOverride: CatalogRepository | null = null;
let catalogPromise: Promise<CatalogRepository> | null = null;
let inventoryOverride: CatalogInventory | null = null;
let inventoryPromise: Promise<CatalogInventory> | null = null;
let cartOverride: CartRepository | null = null;
let cartRepo = createMemoryCartRepository();
let cartPromise: Promise<CartRepository> | null = null;

const composeGlobals = globalThis as unknown as {
  bikesMemoryCart?: CartRepository;
  bikesMemoryOrders?: OrderRepository;
  bikesInventory?: InventoryServices;
  bikesAuthPromise?: Promise<AuthServices>;
};

const DEMO_STOCK: InventoryItem[] = [
  { id: "inv-emonda-m-black", variantId: "v-emonda-m-black", onHand: 4, reserved: 0 },
  { id: "inv-emonda-l-black", variantId: "v-emonda-l-black", onHand: 2, reserved: 0 },
  { id: "inv-emonda-m-red", variantId: "v-emonda-m-red", onHand: 0, reserved: 0 },
  { id: "inv-emonda-l-red", variantId: "v-emonda-l-red", onHand: 1, reserved: 0 },
];

function demoInventoryServices(): InventoryServices {
  return createInventoryServices({
    inventory: createMemoryInventoryRepository(DEMO_STOCK),
    clock: { now: () => new Date() },
  });
}

function sharedMemoryCart(): CartRepository {
  if (process.env.VITEST === "true") {
    return cartRepo;
  }
  composeGlobals.bikesMemoryCart ??= createMemoryCartRepository();
  return composeGlobals.bikesMemoryCart;
}
const demoCatalog = createDemoCatalogRepository();
let orderRepo: OrderRepository = emptyOrders;
let customerRepo: CustomerRepository = createMemoryCustomerRepository();
let wishlistRepo: WishlistRepository = createMemoryWishlistRepository();
let wishlistCatalog: WishlistCatalog = {
  async productExists() {
    return false;
  },
};
let authOverride: AuthServices | null = null;
let authPromise: Promise<AuthServices> | null = null;
let mediaOverride: MediaServices | null = null;
let mediaPromise: Promise<MediaServices> | null = null;
let stockOverride: InventoryServices | null = null;
let stockPromise: Promise<InventoryServices> | null = null;

export async function getCatalogRepository(): Promise<CatalogRepository> {
  if (catalogOverride) {
    return catalogOverride;
  }
  if (process.env.VITEST === "true") {
    return emptyCatalog;
  }
  if (process.env.NODE_ENV !== "production") {
    return demoCatalog;
  }
  if (!catalogPromise) {
    catalogPromise = createPrismaCatalogRepository();
  }
  return catalogPromise;
}

export async function getCatalogServices(): Promise<CatalogServices> {
  return createCatalogServices({
    catalog: await getCatalogRepository(),
    clock: { now: () => new Date() },
    inventory: await getCatalogInventory(),
  });
}

export async function getCatalogAdminServices(): Promise<CatalogAdminServices> {
  return createCatalogAdminServices({
    catalog: await getCatalogRepository(),
    clock: { now: () => new Date() },
  });
}

export async function getCatalogInventory(): Promise<CatalogInventory> {
  if (inventoryOverride) {
    return inventoryOverride;
  }
  if (process.env.VITEST === "true") {
    return emptyInventory;
  }
  if (process.env.NODE_ENV !== "production") {
    return getInventoryServices();
  }
  if (!inventoryPromise) {
    inventoryPromise = createPrismaCatalogInventory();
  }
  return inventoryPromise;
}

function storefrontCatalog(): CartCatalog {
  return {
    async variantIsPurchasable(variantId) {
      const [snapshot] = await this.getVariantSnapshots([variantId]);
      return snapshot?.purchasable === true;
    },
    async getVariantSnapshots(variantIds) {
      if (variantIds.length === 0) {
        return [];
      }
      const wanted = new Set(variantIds);
      const catalog = await getCatalogRepository();
      const inventory = await getCatalogInventory();
      const products = await catalog.listAll();
      const now = new Date();
      const relatedIds = products.flatMap((product) =>
        product.variants.some((variant) => wanted.has(variant.id))
          ? product.variants.map((variant) => variant.id)
          : [],
      );
      const stockRows = await inventory.listAvailabilityByVariantIds(relatedIds);
      const availableById = new Map(
        stockRows.map((row) => [row.variantId, row.available]),
      );
      const snapshots: CartVariantSnapshot[] = [];
      for (const product of products) {
        const listed = isListedOnStorefront(product, now);
        for (const variant of product.variants) {
          if (!wanted.has(variant.id)) {
            continue;
          }
          const available = availableById.get(variant.id) ?? 0;
          snapshots.push({
            variantId: variant.id,
            productId: product.id,
            productSlug: product.slug,
            productName: product.name,
            brandName: product.brandName,
            frameSize: variant.frameSize,
            color: variant.color,
            wheelSize: variant.wheelSize,
            listPriceMinor: variant.listPriceMinor,
            available,
            purchasable: listed && isSellableVariant(variant) && available > 0,
            siblings: product.variants
              .filter((other) => other.id !== variant.id)
              .map((other) => {
                const otherAvailable = availableById.get(other.id) ?? 0;
                return {
                  variantId: other.id,
                  frameSize: other.frameSize,
                  color: other.color,
                  wheelSize: other.wheelSize,
                  listPriceMinor: other.listPriceMinor,
                  available: otherAvailable,
                  purchasable: listed && isSellableVariant(other) && otherAvailable > 0,
                };
              }),
          });
        }
      }
      return snapshots;
    },
  };
}

async function getCartRepository(): Promise<CartRepository> {
  if (cartOverride) {
    return cartOverride;
  }
  if (process.env.VITEST === "true" || process.env.NODE_ENV !== "production") {
    return sharedMemoryCart();
  }
  if (!cartPromise) {
    cartPromise = createPrismaCartRepository();
  }
  return cartPromise;
}

export async function getCartServices(): Promise<CartServices> {
  return createCartServices({
    carts: await getCartRepository(),
    catalog: storefrontCatalog(),
    pricing: createPricingServices(),
  });
}

export function setCartRepository(repository: CartRepository): void {
  cartOverride = repository;
}

export function getDeliveryServices(): DeliveryServices {
  return createDeliveryServices({
    methods: createDemoDeliveryRepository(),
    shipments: createMemoryShipments(),
  });
}

export function getOrderRepository(): OrderRepository {
  if (process.env.VITEST === "true") {
    return orderRepo;
  }
  if (process.env.NODE_ENV !== "production") {
    composeGlobals.bikesMemoryOrders ??= createMemoryOrderRepository();
    return composeGlobals.bikesMemoryOrders;
  }
  return orderRepo;
}

export async function getOrderServices(): Promise<OrderServices> {
  const clock = { now: () => new Date() };
  const orders =
    process.env.NODE_ENV === "production" && process.env.VITEST !== "true"
      ? await createPrismaOrderRepository()
      : getOrderRepository();
  return createOrderServices({
    orders,
    carts: orderCartAdapter(await getCartRepository()),
    catalog: orderCatalogAdapter(await getCatalogRepository()),
    inventory: orderInventoryAdapter(await getInventoryServices()),
    delivery: orderDeliveryAdapter(getDeliveryServices()),
    clock,
  });
}

/** Test-only substitution. Production will pass Prisma repositories. */
export function setCatalogRepository(repository: CatalogRepository): void {
  catalogOverride = repository;
}

export function setCatalogInventory(inventory: CatalogInventory): void {
  inventoryOverride = inventory;
}

export function setOrderRepository(repository: OrderRepository): void {
  orderRepo = repository;
  composeGlobals.bikesMemoryOrders = repository;
}

export function resetRepositories(): void {
  catalogOverride = null;
  catalogPromise = null;
  inventoryOverride = null;
  inventoryPromise = null;
  orderRepo = emptyOrders;
  customerRepo = createMemoryCustomerRepository();
  wishlistRepo = createMemoryWishlistRepository();
  wishlistCatalog = {
    async productExists() {
      return false;
    },
  };
  authOverride = null;
  authPromise = null;
  mediaOverride = null;
  mediaPromise = null;
  stockOverride = null;
  stockPromise = null;
  cartOverride = null;
  cartPromise = null;
  cartRepo = createMemoryCartRepository();
  composeGlobals.bikesMemoryCart = cartRepo;
  composeGlobals.bikesMemoryOrders = createMemoryOrderRepository();
  delete composeGlobals.bikesAuthPromise;
  delete composeGlobals.bikesInventory;
}

export function setInventoryServices(services: InventoryServices): void {
  stockOverride = services;
}

export async function getInventoryServices(): Promise<InventoryServices> {
  if (stockOverride) {
    return stockOverride;
  }
  if (stockPromise) {
    return stockPromise;
  }
  stockPromise = (async () => {
    if (process.env.VITEST === "true") {
      return createInventoryServices({
        inventory: createMemoryInventoryRepository(),
        clock: { now: () => new Date() },
      });
    }
    if (process.env.NODE_ENV !== "production") {
      composeGlobals.bikesInventory ??= demoInventoryServices();
      return composeGlobals.bikesInventory;
    }
    return createInventoryServices({
      inventory: await createPrismaInventoryRepository(),
      clock: { now: () => new Date() },
    });
  })();
  return stockPromise;
}

export function setMediaServices(services: MediaServices): void {
  mediaOverride = services;
}

export async function getMediaServices(): Promise<MediaServices> {
  if (mediaOverride) {
    return mediaOverride;
  }
  if (mediaPromise) {
    return mediaPromise;
  }
  mediaPromise = (async () => {
    if (process.env.VITEST === "true") {
      return createMediaServices({
        store: createMemoryMediaStore(),
        assets: createMemoryMediaRepository(),
        references: createMemoryMediaReferences(),
        clock: { now: () => new Date() },
      });
    }
    const catalog = await getCatalogRepository();
    return createMediaServices({
      store: await createFilesystemMediaStore(),
      assets:
        process.env.NODE_ENV === "production"
          ? await createPrismaMediaRepository()
          : createMemoryMediaRepository(),
      references: catalogMediaReferences(catalog),
      clock: { now: () => new Date() },
    });
  })();
  return mediaPromise;
}

export function setCustomerRepository(repository: CustomerRepository): void {
  customerRepo = repository;
}

export function setWishlistRepository(repository: WishlistRepository): void {
  wishlistRepo = repository;
}

export function getCustomerServices(): CustomerServices {
  return createCustomerServices({ customers: customerRepo });
}

export function getWishlistServices(): WishlistServices {
  return createWishlistServices({ wishlists: wishlistRepo, catalog: wishlistCatalog });
}

export function setAuthServices(services: AuthServices): void {
  authOverride = services;
}

export async function getAuthServices(): Promise<AuthServices> {
  if (authOverride) {
    return authOverride;
  }
  if (process.env.VITEST === "true") {
    if (!authPromise) {
      authPromise = createMemoryAuthServices();
    }
    return authPromise;
  }
  if (!composeGlobals.bikesAuthPromise) {
    composeGlobals.bikesAuthPromise =
      process.env.NODE_ENV !== "production"
        ? createDemoAuthServices()
        : import("@/modules/identity").then((mod) => mod.createPrismaAuthServices());
  }
  return composeGlobals.bikesAuthPromise;
}

export function getPaymentServices() {
  return createPaymentServices({
    payments: emptyPayments,
    provider: new MockPaymentProvider(),
    orders: emptyPaymentOrders,
  });
}
