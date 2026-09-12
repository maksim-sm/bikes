import { describe, expect, it } from "vitest";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { customerPrincipal } from "../domain/principal";
import { addProduct, removeProduct, type Wishlist } from "../domain/wishlist";
import type {
  WishlistCatalog,
  WishlistCatalogProduct,
  WishlistRepository,
  WishlistStock,
} from "./ports";
import { createWishlistServices } from "./wishlist-services";

function memoryWishlist(): WishlistRepository {
  let wishlist: Wishlist | null = null;
  return {
    async getByUser() {
      return wishlist;
    },
    async create(userId) {
      wishlist = { id: "w1", userId, items: [] };
      return wishlist;
    },
    async save(next) {
      wishlist = next;
      return next;
    },
  };
}

function catalogProduct(
  overrides: Partial<WishlistCatalogProduct> = {},
): WishlistCatalogProduct {
  return {
    id: "p1",
    slug: "emonda",
    name: "Émonda SL 5",
    brandName: "Trek",
    listed: true,
    listPriceMinor: 450_000,
    variantIds: ["v1"],
    image: null,
    ...overrides,
  };
}

function services(options?: {
  products?: Record<string, WishlistCatalogProduct | null>;
  inStock?: readonly string[];
  wishlists?: WishlistRepository;
}) {
  const products = options?.products ?? { p1: catalogProduct() };
  const inStock = new Set(options?.inStock ?? ["v1"]);
  const catalog: WishlistCatalog = {
    async getProduct(productId) {
      return products[productId] ?? null;
    },
  };
  const stock: WishlistStock = {
    async anyInStock(variantIds) {
      return variantIds.some((id) => inStock.has(id));
    },
  };
  return createWishlistServices({
    wishlists: options?.wishlists ?? memoryWishlist(),
    catalog,
    stock,
  });
}

describe("wishlist rules", () => {
  it("stores products, not variants, snapshots the price, and rejects duplicates", () => {
    const wishlist: Wishlist = {
      id: "w1",
      userId: "u1",
      items: [{ productId: "p1", savedPriceMinor: 100 }],
    };
    expect(() => addProduct(wishlist, "p1", 100)).toThrow("wishlist_duplicate");
    expect(addProduct(wishlist, "p2", 200).items).toEqual([
      { productId: "p1", savedPriceMinor: 100 },
      { productId: "p2", savedPriceMinor: 200 },
    ]);
    expect(removeProduct(wishlist, "p1").items).toEqual([]);
    expect(removeProduct(wishlist, "missing").items).toEqual(wishlist.items);
  });
});

describe("wishlist services", () => {
  it("adds a known product once and forbids a stranger", async () => {
    const wishlist = services();
    const self = customerPrincipal("u1");
    const saved = await wishlist.addProduct(self, "u1", "p1");
    expect(saved.items).toEqual([{ productId: "p1", savedPriceMinor: 450_000 }]);
    await expect(wishlist.addProduct(self, "u1", "p1")).rejects.toBeInstanceOf(
      ConflictError,
    );
    await expect(wishlist.addProduct(self, "u1", "missing")).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(
      wishlist.getWishlist(customerPrincipal("u2"), "u1"),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("keeps missing, unavailable, out-of-stock, and price-changed items on the view", async () => {
    const wishlists = memoryWishlist();
    await wishlists.create("u1");
    await wishlists.save({
      id: "w1",
      userId: "u1",
      items: [
        { productId: "gone", savedPriceMinor: 100 },
        { productId: "draft", savedPriceMinor: 200 },
        { productId: "oos", savedPriceMinor: 300 },
        { productId: "priced", savedPriceMinor: 400 },
      ],
    });
    const wishlist = services({
      wishlists,
      products: {
        draft: catalogProduct({
          id: "draft",
          slug: "draft",
          listed: false,
          listPriceMinor: 200,
          variantIds: ["v-draft"],
        }),
        oos: catalogProduct({
          id: "oos",
          slug: "oos",
          listPriceMinor: 300,
          variantIds: ["v-oos"],
        }),
        priced: catalogProduct({
          id: "priced",
          slug: "priced",
          listPriceMinor: 500,
          variantIds: ["v-priced"],
        }),
      },
      inStock: ["v-priced"],
    });

    const view = await wishlist.getWishlistView(customerPrincipal("u1"), "u1");
    expect(view.items.map((item) => [item.productId, item.issues])).toEqual([
      ["gone", ["missing"]],
      ["draft", ["unavailable"]],
      ["oos", ["out_of_stock"]],
      ["priced", ["price_changed"]],
    ]);
    expect(
      view.items.find((item) => item.productId === "priced")?.currentPriceMinor,
    ).toBe(500);
  });
});
