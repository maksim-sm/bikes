import { describe, expect, it } from "vitest";
import { ConflictError, ForbiddenError, ValidationError } from "@/lib/errors";
import { customerPrincipal, staffPrincipal } from "@/modules/identity";
import type { Cart } from "@/modules/cart";
import type { Product } from "@/modules/catalog";
import { checkoutTotals } from "../domain/checkout";
import { formatOrderNumber, transitionOrder } from "../domain/order";
import type {
  OrderCart,
  OrderCatalog,
  OrderDelivery,
  OrderInventory,
  OrderRepository,
  PlaceOrderInput,
} from "./ports";
import {
  createFailingEmailChannel,
  createMemoryNotificationRepository,
  createNotificationServices,
} from "@/modules/notifications";
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
      barcode: null,
      frameSize: "M",
      wheelSize: "28",
      color: "чёрный",
      listPriceMinor: 1000,
      currency: "BYN",
      status: "active",
      isActive: true,
      images: [],
    },
  ],
};

const destination = {
  recipientName: "Иван",
  phone: "+375291112233",
  region: "Минск",
  city: "Минск",
  street: "Независимости 1",
  postalCode: "220000",
};

function placeInput(overrides: Partial<PlaceOrderInput> = {}): PlaceOrderInput {
  return {
    cartId: "c1",
    actorUserId: "user-1",
    customerEmail: "a@b.by",
    customerName: "Иван",
    customerPhone: "+375291112233",
    destination,
    deliveryMethodCode: "minsk-courier",
    paymentMethodCode: "cash_on_delivery",
    ...overrides,
  };
}

function setup(options?: {
  available?: number;
  catalogProduct?: Product | null;
  quote?: { costMinor: number; methodName: string } | null;
  reserve?: (input: {
    variantId: string;
    quantity: number;
    orderId: string;
  }) => Promise<void>;
  cart?: Partial<Cart>;
  notify?: ReturnType<typeof createNotificationServices>;
}) {
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
    async listByUser(userId) {
      return [...orders.values()].filter((order) => order.userId === userId);
    },
    async listForStaff() {
      return [...orders.values()];
    },
  };
  const cart: Cart = {
    id: "c1",
    userId: "user-1",
    guestToken: null,
    items: [{ variantId: "v1", quantity: 2 }],
    ...options?.cart,
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
      return options?.catalogProduct === undefined ? product : options.catalogProduct;
    },
  };
  const reserved: string[] = [];
  const cancelled: string[] = [];
  const committed: string[] = [];
  const inventory: OrderInventory = {
    async getAvailable() {
      return options?.available ?? 8;
    },
    async reserveForOrder(input) {
      if (options?.reserve) {
        await options.reserve(input);
        return;
      }
      reserved.push(`${input.variantId}:${input.quantity}`);
    },
    async hasActiveForOrder() {
      return reserved.length > cancelled.length;
    },
    async confirmForOrder() {},
    async cancelForOrder(orderId) {
      cancelled.push(orderId);
    },
    async commitForOrder(orderId) {
      committed.push(orderId);
    },
  };
  const delivery: OrderDelivery = {
    async quote() {
      return options?.quote === undefined
        ? { costMinor: 2500, methodName: "Курьер по Минску" }
        : options.quote;
    },
  };
  const services = createOrderServices({
    orders: repo,
    carts,
    catalog,
    inventory,
    delivery,
    clock: { now: () => new Date("2026-09-12T10:00:00.000Z") },
    ...(options?.notify ? { notify: options.notify } : {}),
  });
  return { services, reserved, cancelled, committed, orders, cart };
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

describe("checkout totals", () => {
  it("adds line totals and delivery without accepting a client total", () => {
    expect(checkoutTotals([2000, 1500], 2500)).toEqual({
      subtotalMinor: 3500,
      deliveryCostMinor: 2500,
      totalMinor: 6000,
    });
  });
});

describe("order services", () => {
  it("snapshots current catalogue prices, quotes delivery, and reserves stock", async () => {
    const { services, reserved, cart } = setup();
    const order = await services.checkout(placeInput());
    expect(order.subtotalMinor).toBe(2000);
    expect(order.deliveryCostMinor).toBe(2500);
    expect(order.totalMinor).toBe(4500);
    expect(order.deliveryMethodName).toBe("Курьер по Минску");
    expect(order.customerEmail).toBe("a@b.by");
    expect(order.paymentMethodCode).toBe("cash_on_delivery");
    expect(order.items[0]?.productName).toBe("Émonda");
    expect(order.items[0]?.unitPriceMinor).toBe(1000);
    expect(order.paymentStatus).toBe("PENDING");
    expect(order.fulfillmentStatus).toBe("UNFULFILLED");
    expect(reserved).toEqual(["v1:2"]);
    expect(cart.items).toEqual([]);
  });

  it("ignores a client-supplied total and uses the server quote and list price", async () => {
    const { services } = setup({
      quote: { costMinor: 2500, methodName: "Курьер по Минску" },
    });
    const forged = placeInput() as PlaceOrderInput & {
      totalMinor: number;
      unitPriceMinor: number;
    };
    forged.totalMinor = 1;
    forged.unitPriceMinor = 1;
    const order = await services.placeOrder(forged);
    expect(order.totalMinor).toBe(4500);
    expect(order.totalMinor).not.toBe(1);
    expect(order.items[0]?.unitPriceMinor).toBe(1000);
  });

  it("rejects an empty cart, inactive variant, oversell, and unknown delivery", async () => {
    await expect(
      setup({ cart: { items: [] } }).services.checkout(placeInput()),
    ).rejects.toBeInstanceOf(ValidationError);

    const inactive = {
      ...product,
      variants: [
        { ...product.variants[0]!, status: "inactive" as const, isActive: false },
      ],
    };
    await expect(
      setup({ catalogProduct: inactive }).services.checkout(placeInput()),
    ).rejects.toBeInstanceOf(ConflictError);

    await expect(
      setup({ available: 1 }).services.checkout(placeInput()),
    ).rejects.toBeInstanceOf(ConflictError);

    await expect(
      setup({ quote: null }).services.checkout(placeInput()),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("rejects invalid customer data", async () => {
    const { services } = setup();
    await expect(
      services.checkout(placeInput({ customerEmail: "not-an-email" })),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      services.checkout(placeInput({ customerPhone: "12" })),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      services.checkout(placeInput({ customerName: "   " })),
    ).rejects.toBeInstanceOf(ValidationError);
    await expect(
      services.checkout(placeInput({ paymentMethodCode: "forged-free" })),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("releases reserved units and cancels the order if a later reserve fails", async () => {
    let calls = 0;
    const { services, cancelled, orders } = setup({
      reserve: async () => {
        calls += 1;
        if (calls === 1) {
          throw new ConflictError("insufficient available inventory");
        }
      },
    });
    await expect(services.checkout(placeInput())).rejects.toBeInstanceOf(ConflictError);
    expect(cancelled).toHaveLength(1);
    expect([...orders.values()][0]?.status).toBe("CANCELLED");
  });

  it("releases reserved units when payment fails and re-reserves on retry", async () => {
    const { services, cancelled, reserved } = setup();
    const placed = await services.placeOrder(placeInput());
    await services.applyPaymentEvent(placed.id, { type: "failed" });
    expect(cancelled).toEqual([placed.id]);
    await services.applyPaymentEvent(placed.id, { type: "failed" });
    expect(cancelled).toEqual([placed.id, placed.id]);
    expect(reserved).toEqual(["v1:2"]);
    await services.applyPaymentEvent(placed.id, { type: "created" });
    expect(reserved).toEqual(["v1:2", "v1:2"]);
  });

  it("can cancel a paid order without changing payment status", async () => {
    const { services, cancelled: released } = setup();
    const placed = await services.placeOrder(placeInput());
    await services.applyPaymentEvent(placed.id, { type: "succeeded" });
    const cancelled = await services.cancelOrder(placed.id, customerPrincipal("user-1"));
    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.paymentStatus).toBe("SUCCEEDED");
    expect(released).toEqual([placed.id]);
  });

  it("rejects strangers reading an order", async () => {
    const { services } = setup();
    const placed = await services.placeOrder(placeInput());
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
    const listed = await services.listOrders(customerPrincipal("user-1"));
    expect(listed.map((order) => order.id)).toEqual([placed.id]);
    await expect(services.listOrders(customerPrincipal("user-2"))).resolves.toEqual([]);
    await expect(
      services.listOrders(staffPrincipal("ops", ["order_management"])),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("refuses a second cancel", async () => {
    const { services } = setup();
    const placed = await services.placeOrder(placeInput());
    await services.cancelOrder(placed.id, customerPrincipal("user-1"));
    await expect(
      services.cancelOrder(placed.id, customerPrincipal("user-1")),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("lets order staff list, filter, complete, and annotate an order", async () => {
    const { services } = setup();
    const placed = await services.placeOrder(placeInput());
    const ops = staffPrincipal("ops", ["order_management"]);
    await expect(
      services.listStaffOrders(customerPrincipal("user-1")),
    ).rejects.toBeInstanceOf(ForbiddenError);
    const listed = await services.listStaffOrders(ops);
    expect(listed.map((order) => order.id)).toEqual([placed.id]);

    const noted = await services.updateStaffNotes(placed.id, ops, "  позвонить  ");
    expect(noted.staffNotes).toBe("позвонить");

    const completed = await services.completeOrder(placed.id, ops);
    expect(completed.status).toBe("COMPLETED");
    await expect(services.completeOrder(placed.id, ops)).rejects.toBeInstanceOf(
      ConflictError,
    );
  });

  it("records order.created after a successful checkout and keeps PLACED if mail fails", async () => {
    const created = createNotificationServices({
      notifications: createMemoryNotificationRepository(),
      channel: createFailingEmailChannel("smtp_down"),
    });
    const { services } = setup({ notify: created });
    const order = await services.placeOrder(placeInput());
    expect(order.status).toBe("PLACED");
    const rows = await created.listByEntity("order", order.id);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ event: "order.created", status: "FAILED" });
  });

  it("does not notify created or cancelled when reserve fails mid-checkout", async () => {
    const notify = createNotificationServices({
      notifications: createMemoryNotificationRepository(),
      channel: createFailingEmailChannel(),
    });
    let calls = 0;
    const { services, orders } = setup({
      notify,
      reserve: async () => {
        calls += 1;
        if (calls === 1) {
          throw new ConflictError("insufficient available inventory");
        }
      },
    });
    await expect(services.checkout(placeInput())).rejects.toBeInstanceOf(ConflictError);
    const cancelled = [...orders.values()][0];
    expect(cancelled?.status).toBe("CANCELLED");
    expect(await notify.listByEntity("order", cancelled!.id)).toEqual([]);
  });

  it("notifies order.cancelled after an explicit cancel", async () => {
    const notify = createNotificationServices({
      notifications: createMemoryNotificationRepository(),
      channel: createFailingEmailChannel(),
    });
    const { services } = setup({ notify });
    const placed = await services.placeOrder(placeInput());
    await services.cancelOrder(placed.id, customerPrincipal("user-1"));
    const events = (await notify.listByEntity("order", placed.id)).map((row) => row.event);
    expect(events.sort()).toEqual(["order.cancelled", "order.created"]);
  });
});
