import { describe, expect, it } from "vitest";
import { ConflictError } from "@/lib/errors";
import { createPricingServices } from "@/modules/pricing";
import {
  addToLine,
  assertLineQuantity,
  mergeCartItems,
  replaceLineVariant,
  type CartActor,
} from "../domain/cart";
import { createMemoryCartRepository } from "../infrastructure/memory-cart-repository";
import type { CartCatalog, CartVariantSnapshot } from "./ports";
import { createCartServices } from "./services";

const customer: CartActor = { kind: "customer", userId: "user-1" };
const guest: CartActor = { kind: "guest", guestToken: "guest-1" };

function snapshot(input: {
  variantId: string;
  listPriceMinor: number;
  available: number;
  purchasable?: boolean;
  siblings?: CartVariantSnapshot["siblings"];
  productId?: string;
}): CartVariantSnapshot {
  return {
    variantId: input.variantId,
    productId: input.productId ?? "p1",
    productSlug: "emonda",
    productName: "Émonda SL 5",
    brandName: "Trek",
    frameSize: input.variantId === "v2" ? "L" : "M",
    color: "чёрный",
    wheelSize: "28",
    listPriceMinor: input.listPriceMinor,
    available: input.available,
    purchasable: input.purchasable ?? input.available > 0,
    siblings: input.siblings ?? [],
  };
}

function catalogWith(
  rows: CartVariantSnapshot[],
  overrides: Partial<Record<string, Partial<CartVariantSnapshot>>> = {},
): CartCatalog {
  return {
    async variantIsPurchasable(variantId) {
      const [found] = await this.getVariantSnapshots([variantId]);
      return found?.purchasable === true;
    },
    async getVariantSnapshots(variantIds) {
      return variantIds.flatMap((variantId) => {
        const base = rows.find((row) => row.variantId === variantId);
        if (!base) {
          return [];
        }
        return [{ ...base, ...overrides[variantId] }];
      });
    },
  };
}

function carts() {
  return createCartServices({
    carts: createMemoryCartRepository(),
    catalog: catalogWith([
      snapshot({
        variantId: "v1",
        listPriceMinor: 100_00,
        available: 8,
        siblings: [
          {
            variantId: "v2",
            frameSize: "L",
            color: "чёрный",
            wheelSize: "28",
            listPriceMinor: 120_00,
            available: 5,
            purchasable: true,
          },
        ],
      }),
      snapshot({
        variantId: "v2",
        listPriceMinor: 120_00,
        available: 5,
        siblings: [
          {
            variantId: "v1",
            frameSize: "M",
            color: "чёрный",
            wheelSize: "28",
            listPriceMinor: 100_00,
            available: 8,
            purchasable: true,
          },
        ],
      }),
    ]),
    pricing: createPricingServices(),
  });
}

describe("cart quantity rules", () => {
  it("rejects zero and oversized lines", () => {
    expect(() => assertLineQuantity(0)).toThrow("quantity_too_small");
    expect(() => assertLineQuantity(11)).toThrow("quantity_too_large");
    expect(addToLine([], "v1", 2)).toEqual([{ variantId: "v1", quantity: 2 }]);
  });

  it("merges guest lines onto a customer cart and caps at the line maximum", () => {
    expect(
      mergeCartItems(
        [{ variantId: "v1", quantity: 8 }],
        [
          { variantId: "v1", quantity: 4 },
          { variantId: "v2", quantity: 1 },
        ],
      ),
    ).toEqual([
      { variantId: "v1", quantity: 10 },
      { variantId: "v2", quantity: 1 },
    ]);
  });

  it("replaces a line variant and sums quantities when the target already exists", () => {
    expect(
      replaceLineVariant(
        [
          { variantId: "v1", quantity: 2 },
          { variantId: "v2", quantity: 3 },
        ],
        "v1",
        "v2",
      ),
    ).toEqual([{ variantId: "v2", quantity: 5 }]);
  });
});

describe("cart services", () => {
  it("keeps anonymous and authenticated carts separate", async () => {
    const cart = carts();
    await cart.addItem(guest, "v1", 1);
    await cart.addItem(customer, "v2", 2);
    expect((await cart.getCart(guest)).items).toEqual([{ variantId: "v1", quantity: 1 }]);
    expect((await cart.getCart(customer)).items).toEqual([
      { variantId: "v2", quantity: 2 },
    ]);
  });

  it("adds, changes quantity, and removes a line", async () => {
    const cart = carts();
    await cart.addItem(customer, "v1", 2);
    expect((await cart.setItemQuantity(customer, "v1", 4)).items).toEqual([
      { variantId: "v1", quantity: 4 },
    ]);
    expect((await cart.removeItem(customer, "v1")).items).toEqual([]);
  });

  it("refuses inactive or out-of-stock variants", async () => {
    const cart = carts();
    await expect(cart.addItem(customer, "missing", 1)).rejects.toBeInstanceOf(
      ConflictError,
    );
    const tight = createCartServices({
      carts: createMemoryCartRepository(),
      catalog: catalogWith([
        snapshot({ variantId: "v1", listPriceMinor: 100_00, available: 1 }),
      ]),
      pricing: createPricingServices(),
    });
    await expect(tight.addItem(customer, "v1", 2)).rejects.toBeInstanceOf(ConflictError);
  });

  it("switches a line to a sibling variant", async () => {
    const cart = carts();
    await cart.addItem(customer, "v1", 2);
    const updated = await cart.replaceItemVariant(customer, "v1", "v2");
    expect(updated.items).toEqual([{ variantId: "v2", quantity: 2 }]);
  });

  it("recalculates totals from current catalogue prices", async () => {
    const prices = new Map<string, number>([["v1", 100_00]]);
    const catalog: CartCatalog = {
      async variantIsPurchasable() {
        return true;
      },
      async getVariantSnapshots(variantIds) {
        return variantIds.map((variantId) =>
          snapshot({
            variantId,
            listPriceMinor: prices.get(variantId) ?? 0,
            available: 8,
          }),
        );
      },
    };
    const cart = createCartServices({
      carts: createMemoryCartRepository(),
      catalog,
      pricing: createPricingServices(),
    });
    await cart.addItem(customer, "v1", 2);
    expect((await cart.getCartView(customer)).subtotalMinor).toBe(200_00);
    prices.set("v1", 150_00);
    const view = await cart.getCartView(customer);
    expect(view.items[0]?.unitPriceMinor).toBe(150_00);
    expect(view.items[0]?.lineTotalMinor).toBe(300_00);
    expect(view.subtotalMinor).toBe(300_00);
    expect(view.currency).toBe("BYN");
  });

  it("revalidates availability without writing a negative available quantity", async () => {
    let available = 5;
    const catalog: CartCatalog = {
      async variantIsPurchasable() {
        return available > 0;
      },
      async getVariantSnapshots(variantIds) {
        return variantIds.map((variantId) =>
          snapshot({
            variantId,
            listPriceMinor: 100_00,
            available,
            purchasable: available > 0,
          }),
        );
      },
    };
    const cart = createCartServices({
      carts: createMemoryCartRepository(),
      catalog,
      pricing: createPricingServices(),
    });
    await cart.addItem(customer, "v1", 3);
    available = 1;
    const view = await cart.getCartView(customer);
    expect(view.items[0]?.available).toBe(1);
    expect(view.items[0]?.issues).toContain("insufficient_available");
    expect(view.items[0]?.quantity).toBe(3);
    expect(view.subtotalMinor).toBe(300_00);
  });

  it("claimForCheckout gives the lines to only one concurrent caller", async () => {
    const repo = createMemoryCartRepository();
    const created = await repo.create(customer);
    created.items = [{ variantId: "v1", quantity: 2 }];
    await repo.save(created);
    const [first, second] = await Promise.all([
      repo.claimForCheckout(created.id),
      repo.claimForCheckout(created.id),
    ]);
    const taken = [first, second].filter((cart) => (cart?.items.length ?? 0) > 0);
    expect(taken).toHaveLength(1);
    expect(taken[0]?.items).toEqual([{ variantId: "v1", quantity: 2 }]);
    expect((await repo.findById(created.id))?.items).toEqual([]);
  });

  it("merges a guest cart onto the customer cart on login", async () => {
    const repo = createMemoryCartRepository();
    const cart = createCartServices({
      carts: repo,
      catalog: catalogWith([
        snapshot({ variantId: "v1", listPriceMinor: 100_00, available: 8 }),
        snapshot({ variantId: "v2", listPriceMinor: 120_00, available: 5 }),
      ]),
      pricing: createPricingServices(),
    });
    await cart.addItem(guest, "v1", 2);
    await cart.addItem(guest, "v2", 1);
    await cart.addItem(customer, "v1", 1);
    const merged = await cart.mergeOnLogin(guest, customer);
    expect(merged.userId).toBe("user-1");
    expect(merged.guestToken).toBeNull();
    expect(merged.items).toEqual([
      { variantId: "v1", quantity: 3 },
      { variantId: "v2", quantity: 1 },
    ]);
    expect(await repo.findByActor(guest)).toBeNull();
  });

  it("adopts the guest cart when the customer has none", async () => {
    const cart = carts();
    await cart.addItem(guest, "v1", 2);
    const merged = await cart.mergeOnLogin(guest, customer);
    expect(merged.userId).toBe("user-1");
    expect(merged.items).toEqual([{ variantId: "v1", quantity: 2 }]);
  });

  it("drops unpurchasable guest lines during merge", async () => {
    const repo = createMemoryCartRepository();
    const existing = await repo.create(guest);
    existing.items = [{ variantId: "v1", quantity: 1 }];
    await repo.save(existing);
    const services = createCartServices({
      carts: repo,
      catalog: catalogWith([
        snapshot({
          variantId: "v1",
          listPriceMinor: 100_00,
          available: 0,
          purchasable: false,
        }),
      ]),
      pricing: createPricingServices(),
    });
    const merged = await services.mergeOnLogin(guest, customer);
    expect(merged.items).toEqual([]);
    expect(await repo.findByActor(guest)).toBeNull();
  });

  it("counts a missing catalogue variant as zero in the subtotal", async () => {
    const repo = createMemoryCartRepository();
    const existing = await repo.create(customer);
    existing.items = [{ variantId: "gone", quantity: 2 }];
    await repo.save(existing);
    const services = createCartServices({
      carts: repo,
      catalog: catalogWith([]),
      pricing: createPricingServices(),
    });
    const view = await services.getCartView(customer);
    expect(view.items[0]?.issues).toContain("variant_missing");
    expect(view.items[0]?.unitPriceMinor).toBe(0);
    expect(view.items[0]?.lineTotalMinor).toBe(0);
    expect(view.subtotalMinor).toBe(0);
  });
});
