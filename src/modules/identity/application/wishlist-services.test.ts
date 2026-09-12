import { describe, expect, it } from "vitest";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { customerPrincipal } from "../domain/principal";
import { addProduct, type Wishlist } from "../domain/wishlist";
import type { WishlistRepository } from "./ports";
import { createWishlistServices } from "./wishlist-services";

function memoryWishlist(): WishlistRepository {
  let wishlist: Wishlist | null = null;
  return {
    async getByUser() {
      return wishlist;
    },
    async create(userId) {
      wishlist = { id: "w1", userId, productIds: [] };
      return wishlist;
    },
    async save(next) {
      wishlist = next;
      return next;
    },
  };
}

describe("wishlist rules", () => {
  it("stores products, not variants, and rejects duplicates", () => {
    const wishlist: Wishlist = { id: "w1", userId: "u1", productIds: ["p1"] };
    expect(() => addProduct(wishlist, "p1")).toThrow("wishlist_duplicate");
    expect(addProduct(wishlist, "p2").productIds).toEqual(["p1", "p2"]);
  });
});

describe("wishlist services", () => {
  it("adds a known product once", async () => {
    const wishlist = createWishlistServices({
      wishlists: memoryWishlist(),
      catalog: {
        async productExists(productId) {
          return productId === "p1";
        },
      },
    });
    const self = customerPrincipal("u1");
    await wishlist.addProduct(self, "u1", "p1");
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
});
