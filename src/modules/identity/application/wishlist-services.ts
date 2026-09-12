import { ConflictError, NotFoundError } from "@/lib/errors";
import { addProduct, removeProduct, type Wishlist } from "../domain/wishlist";
import type { Principal } from "../domain/principal";
import {
  assertCanReadCustomerResource,
  assertCanWriteCustomerResource,
} from "./authorization";
import type { WishlistCatalog, WishlistRepository } from "./ports";

export interface WishlistServices {
  getWishlist(principal: Principal, userId: string): Promise<Wishlist>;
  addProduct(principal: Principal, userId: string, productId: string): Promise<Wishlist>;
  removeProduct(
    principal: Principal,
    userId: string,
    productId: string,
  ): Promise<Wishlist>;
}

export function createWishlistServices(deps: {
  wishlists: WishlistRepository;
  catalog: WishlistCatalog;
}): WishlistServices {
  async function loadOrCreate(userId: string): Promise<Wishlist> {
    return (await deps.wishlists.getByUser(userId)) ?? deps.wishlists.create(userId);
  }

  return {
    async getWishlist(principal, userId) {
      assertCanReadCustomerResource(principal, userId);
      return loadOrCreate(userId);
    },

    async addProduct(principal, userId, productId) {
      assertCanWriteCustomerResource(principal, userId);
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

    async removeProduct(principal, userId, productId) {
      assertCanWriteCustomerResource(principal, userId);
      const wishlist = await loadOrCreate(userId);
      return deps.wishlists.save(removeProduct(wishlist, productId));
    },
  };
}
