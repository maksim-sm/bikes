import type { CatalogRepository } from "@/modules/catalog";
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
}

export function getPaymentServices() {
  return createPaymentServices({
    payments: emptyPayments,
    provider: new MockPaymentProvider(),
    orders: emptyPaymentOrders,
  });
}
