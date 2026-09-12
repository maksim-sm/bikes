import type { CatalogRepository } from "@/modules/catalog";
import {
  createCustomerServices,
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

export const emptyCatalog: CatalogRepository = {
  async findBySlug() {
    return null;
  },
  async listPublished() {
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

let catalogRepo: CatalogRepository = emptyCatalog;
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

export function getCatalogRepository(): CatalogRepository {
  return catalogRepo;
}

export function getOrderRepository(): OrderRepository {
  return orderRepo;
}

/** Test-only substitution. Production will pass Prisma repositories. */
export function setCatalogRepository(repository: CatalogRepository): void {
  catalogRepo = repository;
}

export function setOrderRepository(repository: OrderRepository): void {
  orderRepo = repository;
}

export function resetRepositories(): void {
  catalogRepo = emptyCatalog;
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
