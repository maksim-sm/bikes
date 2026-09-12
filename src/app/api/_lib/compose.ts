import type {
  CatalogInventory,
  CatalogListQuery,
  CatalogRepository,
} from "@/modules/catalog";
import {
  catalogMediaReferences,
  createCatalogAdminServices,
  createCatalogServices,
  createDemoCatalogInventory,
  createDemoCatalogRepository,
  createPrismaCatalogRepository,
  type CatalogAdminServices,
  type CatalogServices,
} from "@/modules/catalog";
import {
  createCartServices,
  createMemoryCartRepository,
  type CartCatalog,
  type CartServices,
} from "@/modules/cart";
import {
  createDemoDeliveryRepository,
  createDeliveryServices,
  createMemoryShipments,
  type DeliveryServices,
} from "@/modules/delivery";
import { createPrismaCatalogInventory } from "@/modules/inventory";
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
import type { OrderRepository } from "@/modules/orders";
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
let cartRepo = createMemoryCartRepository();
const demoCatalog = createDemoCatalogRepository();
const demoInventory = createDemoCatalogInventory();
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
    return demoInventory;
  }
  if (!inventoryPromise) {
    inventoryPromise = createPrismaCatalogInventory();
  }
  return inventoryPromise;
}

function storefrontCatalog(): CartCatalog {
  return {
    async variantIsPurchasable(variantId) {
      const inventory = await getCatalogInventory();
      const stock = await inventory.listAvailabilityByVariantIds([variantId]);
      return (stock[0]?.available ?? 0) > 0;
    },
  };
}

export function getCartServices(): CartServices {
  return createCartServices({
    carts: cartRepo,
    catalog: storefrontCatalog(),
  });
}

export function getDeliveryServices(): DeliveryServices {
  return createDeliveryServices({
    methods: createDemoDeliveryRepository(),
    shipments: createMemoryShipments(),
  });
}

export function getOrderRepository(): OrderRepository {
  return orderRepo;
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
  cartRepo = createMemoryCartRepository();
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
  if (!authPromise) {
    authPromise =
      process.env.VITEST === "true"
        ? createMemoryAuthServices()
        : process.env.NODE_ENV !== "production"
          ? createDemoAuthServices()
          : import("@/modules/identity").then((mod) => mod.createPrismaAuthServices());
  }
  return authPromise;
}

export function getPaymentServices() {
  return createPaymentServices({
    payments: emptyPayments,
    provider: new MockPaymentProvider(),
    orders: emptyPaymentOrders,
  });
}
