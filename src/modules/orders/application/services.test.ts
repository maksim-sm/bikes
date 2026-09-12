import { describe, expect, it } from "vitest";
import { ConflictError, ForbiddenError } from "@/lib/errors";
import { customerPrincipal, staffPrincipal } from "@/modules/identity";
import type { Cart } from "@/modules/cart";
import type { Product } from "@/modules/catalog";
import { formatOrderNumber, transitionOrder } from "../domain/order";
import type {
  OrderCart,
  OrderCatalog,
  OrderDelivery,
  OrderInventory,
  OrderRepository,
} from "./ports";
import { createOrderServices } from "./services";
import type { Order } from "../domain/order";

const product: Product = {
  id: "p1",
  slug: "emonda",
  name: "Émonda",
  description: "x",
  status: "PUBLISHED",
  publishedAt: new Date("2026-01-01T00:00:00.000Z"),
  brandName: "Trek",
  brandSlug: "trek",
  categorySlug: "road",
  bicycleType: "ROAD",
  frameMaterial: null,
  groupset: null,
  brakeType: null,
  modelYear: null,
  warrantyMonths: null,
  warrantyText: null,
  images: [],
  variants: [
    {
      id: "v1",
      productId: "p1",
      sku: "EM-M",
      frameSize: "M",
      wheelSize: "28",
      color: "чёрный",
      listPriceMinor: 1000,
      currency: "BYN",
      isActive: true,
    },
  ],
};

function setup() {
  const orders = new Map<string, Order>();
  const repo: OrderRepository = {
    async nextSequence() {
      return orders.size + 1;
    },
    async save(order) {
      orders.set(order.id, order);
      return order;
    },
    async findById(id) {
      return orders.get(id) ?? null;
    },
  };
  const cart: Cart = {
    id: "c1",
    userId: "user-1",
    guestToken: null,
    items: [{ variantId: "v1", quantity: 2 }],
  };
  const carts: OrderCart = {
    async getCartById() {
      return cart;
    },
    async clear() {
      cart.items = [];
    },
  };
  const catalog: OrderCatalog = {
    async getProductForVariant() {
      return product;
    },
  };
  const reserved: string[] = [];
  const inventory: OrderInventory = {
    async reserveForOrder(input) {
      reserved.push(`${input.variantId}:${input.quantity}`);
    },
  };
  const delivery: OrderDelivery = {
    async quote() {
      return { costMinor: 2500, methodName: "Курьер по Минску" };
    },
  };
  const services = createOrderServices({
    orders: repo,
    carts,
    catalog,
    inventory,
    delivery,
    clock: { now: () => new Date("2026-09-12T10:00:00.000Z") },
  });
  return { services, reserved, orders };
}

describe("order status machine", () => {
  it("keeps commercial status independent of payment", () => {
    expect(transitionOrder("PLACED", "cancel")).toBe("CANCELLED");
    expect(() => transitionOrder("CANCELLED", "complete")).toThrow("order_not_open");
    expect(formatOrderNumber(new Date("2026-09-12T10:00:00.000Z"), 7)).toBe(
      "B-20260912-0007",
    );
  });
});

describe("order services", () => {
  it("snapshots prices and reserves stock when placing", async () => {
    const { services, reserved } = setup();
    const order = await services.placeOrder({
      cartId: "c1",
      actorUserId: "user-1",
      customerEmail: "a@b.by",
      customerName: "Иван",
      customerPhone: "+375291112233",
      destination: {
        recipientName: "Иван",
        phone: "+375291112233",
        region: "Минск",
        city: "Минск",
        street: "Независимости 1",
        postalCode: "220000",
      },
      deliveryMethodCode: "minsk-courier",
    });
    expect(order.subtotalMinor).toBe(2000);
    expect(order.totalMinor).toBe(4500);
    expect(order.items[0]?.productName).toBe("Émonda");
    expect(order.paymentStatus).toBe("PENDING");
    expect(order.fulfillmentStatus).toBe("UNFULFILLED");
    expect(reserved).toEqual(["v1:2"]);
  });

  it("can cancel a paid order without changing payment status", async () => {
    const { services } = setup();
    const placed = await services.placeOrder({
      cartId: "c1",
      actorUserId: "user-1",
      customerEmail: "a@b.by",
      customerName: "Иван",
      customerPhone: "+37529",
      destination: {
        recipientName: "Иван",
        phone: "+37529",
        region: "Минск",
        city: "Минск",
        street: "x",
        postalCode: "220000",
      },
      deliveryMethodCode: "minsk-courier",
    });
    await services.applyPaymentEvent(placed.id, { type: "succeeded" });
    const cancelled = await services.cancelOrder(placed.id, customerPrincipal("user-1"));
    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.paymentStatus).toBe("SUCCEEDED");
  });

  it("rejects strangers reading an order", async () => {
    const { services } = setup();
    const placed = await services.placeOrder({
      cartId: "c1",
      actorUserId: "user-1",
      customerEmail: "a@b.by",
      customerName: "Иван",
      customerPhone: "+37529",
      destination: {
        recipientName: "Иван",
        phone: "+37529",
        region: "Минск",
        city: "Минск",
        street: "x",
        postalCode: "220000",
      },
      deliveryMethodCode: "minsk-courier",
    });
    await expect(
      services.getOrder(placed.id, customerPrincipal("user-2")),
    ).rejects.toBeInstanceOf(ForbiddenError);
    await expect(
      services.getOrder(placed.id, staffPrincipal("inv", ["inventory"])),
    ).rejects.toBeInstanceOf(ForbiddenError);
    const asOps = await services.getOrder(
      placed.id,
      staffPrincipal("ops", ["order_management"]),
    );
    expect(asOps.userId).toBe("user-1");
  });

  it("refuses a second cancel", async () => {
    const { services } = setup();
    const placed = await services.placeOrder({
      cartId: "c1",
      actorUserId: "user-1",
      customerEmail: "a@b.by",
      customerName: "Иван",
      customerPhone: "+37529",
      destination: {
        recipientName: "Иван",
        phone: "+37529",
        region: "Минск",
        city: "Минск",
        street: "x",
        postalCode: "220000",
      },
      deliveryMethodCode: "minsk-courier",
    });
    await services.cancelOrder(placed.id, customerPrincipal("user-1"));
    await expect(
      services.cancelOrder(placed.id, customerPrincipal("user-1")),
    ).rejects.toBeInstanceOf(ConflictError);
  });
});
