import { ConflictError, NotFoundError } from "@/lib/errors";
import { addProduct, removeProduct, type Wishlist } from "../domain/wishlist";
import type { WishlistCatalog, WishlistRepository } from "./ports";

export interface WishlistServices {
  getWishlist(userId: string): Promise<Wishlist>;
  addProduct(userId: string, productId: string): Promise<Wishlist>;
  removeProduct(userId: string, productId: string): Promise<Wishlist>;
}

export function createWishlistServices(deps: {
  wishlists: WishlistRepository;
  catalog: WishlistCatalog;
}): WishlistServices {
  async function loadOrCreate(userId: string): Promise<Wishlist> {
    return (await deps.wishlists.getByUser(userId)) ?? deps.wishlists.create(userId);
  }

  return {
    async getWishlist(userId) {
      return loadOrCreate(userId);
    },

    async addProduct(userId, productId) {
      if (!(await deps.catalog.productExists(productId))) {
        throw new NotFoundError("product not found", { productId });
      }
      const wishlist = await loadOrCreate(userId);
      try {
        return deps.wishlists.save(addProduct(wishlist, productId));
      } catch {
        throw new ConflictError("product is already on the wishlist", { productId });
      }
    },

    async removeProduct(userId, productId) {
      const wishlist = await loadOrCreate(userId);
      return deps.wishlists.save(removeProduct(wishlist, productId));
    },
  };
}
