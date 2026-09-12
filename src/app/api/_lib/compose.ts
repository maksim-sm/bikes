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
  isListedOnStorefront,
  isSellableVariant,
  lowestListPriceMinor,
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
import { createPricingServices } from "@/modules/pricing";
import {
  createDemoDeliveryRepository,
  createDeliveryServices,
  createMemoryShipments,
  createPrismaDeliveryRepository,
  createPrismaShipmentRepository,
  type DeliveryServices,
  type ShipmentRepository,
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
  createPrismaCustomerRepository,
  createPrismaWishlistRepository,
  createWishlistServices,
  type AuthServices,
  type CustomerRepository,
  type CustomerServices,
  type WishlistCatalog,
  type WishlistCatalogProduct,
  type WishlistRepository,
  type WishlistServices,
  type WishlistStock,
} from "@/modules/identity";
import {
  demoCustomerAddress,
  demoCustomerOrder,
  demoCustomerProfile,
  demoCustomerShipment,
} from "./demo-account";
import { isAppError } from "@/lib/errors";
import {
  createCheckoutHoldReconciler,
  createMemoryOrderRepository,
  createOrderServices,
  createPrismaOrderRepository,
  orderCartAdapter,
  orderCatalogAdapter,
  orderDeliveryAdapter,
  orderInventoryAdapter,
  type CheckoutHoldReconciler,
  type OrderRepository,
  type OrderServices,
} from "@/modules/orders";
import type { PaymentRepository } from "@/modules/payments";
import {
  createMemoryPaymentRepository,
  createPaymentServices,
  MockPaymentProvider,
} from "@/modules/payments";
import {
  createFilesystemMediaStore,
  createMediaServices,
  createMemoryMediaReferences,
  createMemoryMediaRepository,
  createMemoryMediaStore,
  createPrismaMediaRepository,
  mediaSrc,
  type MediaServices,
} from "@/modules/media";
import {
  createAuditServices,
  createMemoryAuditRepository,
  createPrismaAuditRepository,
  type AuditRepository,
  type AuditServices,
} from "@/modules/audit";

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
  async listByUser() {
    return [];
  },
};

let paymentRepo = createMemoryPaymentRepository();
let paymentProvider = new MockPaymentProvider();

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
  bikesMemoryPayments?: PaymentRepository;
  bikesPaymentProvider?: MockPaymentProvider;
  bikesInventory?: InventoryServices;
  bikesAuthPromise?: Promise<AuthServices>;
  bikesMemoryShipments?: ShipmentRepository;
  bikesMemoryCustomers?: CustomerRepository;
  bikesMemoryWishlist?: WishlistRepository;
  bikesMemoryAudit?: AuditRepository;
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
  async getProduct() {
    return null;
  },
};
let wishlistStock: WishlistStock = {
  async anyInStock() {
    return false;
  },
};
let auditOverride: AuditRepository | null = null;
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

function getDeliveryRepository() {
  if (process.env.VITEST === "true" || process.env.NODE_ENV !== "production") {
    return createDemoDeliveryRepository();
  }
  return createPrismaDeliveryRepository();
}

function getShipmentRepository(): ShipmentRepository {
  if (process.env.VITEST === "true") {
    composeGlobals.bikesMemoryShipments ??= createMemoryShipments();
    return composeGlobals.bikesMemoryShipments;
  }
  if (process.env.NODE_ENV !== "production") {
    composeGlobals.bikesMemoryShipments ??= createMemoryShipments([demoCustomerShipment]);
    return composeGlobals.bikesMemoryShipments;
  }
  return createPrismaShipmentRepository();
}

export function getDeliveryServices(): DeliveryServices {
  return createDeliveryServices({
    methods: getDeliveryRepository(),
    shipments: getShipmentRepository(),
  });
}

export function getOrderRepository(): OrderRepository {
  if (process.env.VITEST === "true") {
    return orderRepo;
  }
  if (process.env.NODE_ENV !== "production") {
    composeGlobals.bikesMemoryOrders ??= createMemoryOrderRepository([demoCustomerOrder]);
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
    payments: {
      cancelOpenForOrder: (orderId) => getPaymentServices().cancelOpenForOrder(orderId),
    },
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
    async getProduct() {
      return null;
    },
  };
  wishlistStock = {
    async anyInStock() {
      return false;
    },
  };
  auditOverride = null;
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
  composeGlobals.bikesMemoryCustomers = createMemoryCustomerRepository();
  composeGlobals.bikesMemoryWishlist = createMemoryWishlistRepository();
  composeGlobals.bikesMemoryAudit = createMemoryAuditRepository();
  paymentRepo = createMemoryPaymentRepository();
  paymentProvider = new MockPaymentProvider();
  composeGlobals.bikesMemoryPayments = paymentRepo;
  composeGlobals.bikesPaymentProvider = paymentProvider;
  composeGlobals.bikesMemoryShipments = createMemoryShipments();
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

export function setWishlistCatalog(catalog: WishlistCatalog): void {
  wishlistCatalog = catalog;
}

export function setWishlistStock(stock: WishlistStock): void {
  wishlistStock = stock;
}

function sharedMemoryWishlist(): WishlistRepository {
  if (process.env.VITEST === "true") {
    return wishlistRepo;
  }
  composeGlobals.bikesMemoryWishlist ??= createMemoryWishlistRepository();
  return composeGlobals.bikesMemoryWishlist;
}

function composeWishlistCatalog(catalog: CatalogRepository): WishlistCatalog {
  return {
    async getProduct(productId) {
      const product = await catalog.findById(productId);
      if (!product) {
        return null;
      }
      const image = [...product.images].sort(
        (left, right) => left.sortOrder - right.sortOrder,
      )[0];
      const mapped: WishlistCatalogProduct = {
        id: product.id,
        slug: product.slug,
        name: product.name,
        brandName: product.brandName,
        listed: isListedOnStorefront(product, new Date()),
        listPriceMinor: lowestListPriceMinor(product),
        variantIds: product.variants
          .filter(isSellableVariant)
          .map((variant) => variant.id),
        image: image ? { src: mediaSrc(image.key), alt: image.alt } : null,
      };
      return mapped;
    },
  };
}

function composeWishlistStock(inventory: CatalogInventory): WishlistStock {
  return {
    async anyInStock(variantIds) {
      if (variantIds.length === 0) {
        return false;
      }
      const rows = await inventory.listAvailabilityByVariantIds(variantIds);
      return rows.some((row) => row.available > 0);
    },
  };
}

function getCustomerRepository(): CustomerRepository {
  if (process.env.VITEST === "true") {
    return customerRepo;
  }
  if (process.env.NODE_ENV !== "production") {
    composeGlobals.bikesMemoryCustomers ??= createMemoryCustomerRepository({
      profiles: [demoCustomerProfile],
      addresses: [demoCustomerAddress],
    });
    return composeGlobals.bikesMemoryCustomers;
  }
  return createPrismaCustomerRepository();
}

export function getCustomerServices(): CustomerServices {
  return createCustomerServices({ customers: getCustomerRepository() });
}

export async function getWishlistServices(): Promise<WishlistServices> {
  if (process.env.VITEST === "true") {
    return createWishlistServices({
      wishlists: wishlistRepo,
      catalog: wishlistCatalog,
      stock: wishlistStock,
    });
  }
  const catalog = composeWishlistCatalog(await getCatalogRepository());
  const stock = composeWishlistStock(await getCatalogInventory());
  const wishlists =
    process.env.NODE_ENV === "production"
      ? createPrismaWishlistRepository()
      : sharedMemoryWishlist();
  return createWishlistServices({ wishlists, catalog, stock });
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

function sharedPaymentRepository(): PaymentRepository {
  if (process.env.VITEST === "true") {
    return paymentRepo;
  }
  composeGlobals.bikesMemoryPayments ??= createMemoryPaymentRepository();
  return composeGlobals.bikesMemoryPayments;
}

function sharedPaymentProvider(): MockPaymentProvider {
  if (process.env.VITEST === "true") {
    return paymentProvider;
  }
  composeGlobals.bikesPaymentProvider ??= new MockPaymentProvider();
  return composeGlobals.bikesPaymentProvider;
}

export function getMockPaymentProvider(): MockPaymentProvider {
  return sharedPaymentProvider();
}

export function getPaymentServices() {
  return createPaymentServices({
    payments: sharedPaymentRepository(),
    provider: sharedPaymentProvider(),
    clock: { now: () => new Date() },
    orders: {
      async amountDueMinor(orderId) {
        try {
          const order = await (await getOrderServices()).getPlacedOrder(orderId);
          return { amountMinor: order.totalMinor, currency: "BYN" };
        } catch (error) {
          if (isAppError(error) && error.code === "not_found") {
            return { amountMinor: 0, currency: "BYN" };
          }
          throw error;
        }
      },
      async applyEvent(orderId, event) {
        try {
          await (await getOrderServices()).applyPaymentEvent(orderId, event);
        } catch (error) {
          if (isAppError(error) && error.code === "not_found") {
            return;
          }
          throw error;
        }
      },
    },
  });
}

export async function getCheckoutHoldReconciler(): Promise<CheckoutHoldReconciler> {
  return createCheckoutHoldReconciler({
    inventory: await getInventoryServices(),
    payments: getPaymentServices(),
  });
}

export function setAuditRepository(repository: AuditRepository): void {
  auditOverride = repository;
}

function getAuditRepository(): AuditRepository {
  if (auditOverride) {
    return auditOverride;
  }
  if (process.env.VITEST === "true") {
    composeGlobals.bikesMemoryAudit ??= createMemoryAuditRepository();
    return composeGlobals.bikesMemoryAudit;
  }
  if (process.env.NODE_ENV !== "production") {
    composeGlobals.bikesMemoryAudit ??= createMemoryAuditRepository();
    return composeGlobals.bikesMemoryAudit;
  }
  return createPrismaAuditRepository();
}

export function getAuditServices(): AuditServices {
  return createAuditServices({
    audit: getAuditRepository(),
    clock: { now: () => new Date() },
  });
}
