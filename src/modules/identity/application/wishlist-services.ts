import { ConflictError, NotFoundError } from "@/lib/errors";
import { addProduct, removeProduct, type Wishlist } from "../domain/wishlist";
import type { Principal } from "../domain/principal";
import {
  assertCanReadCustomerResource,
  assertCanWriteCustomerResource,
} from "./authorization";
import type {
  WishlistCatalog,
  WishlistCatalogProduct,
  WishlistRepository,
  WishlistStock,
} from "./ports";

export type WishlistIssue = "missing" | "unavailable" | "out_of_stock" | "price_changed";

export interface WishlistViewItem {
  productId: string;
  savedPriceMinor: number | null;
  slug: string | null;
  name: string | null;
  brandName: string | null;
  href: string | null;
  image: { src: string; alt: string } | null;
  listed: boolean;
  inStock: boolean;
  currentPriceMinor: number | null;
  issues: WishlistIssue[];
}

export interface WishlistView {
  id: string;
  userId: string;
  items: WishlistViewItem[];
}

export interface WishlistServices {
  getWishlist(principal: Principal, userId: string): Promise<Wishlist>;
  getWishlistView(principal: Principal, userId: string): Promise<WishlistView>;
  addProduct(principal: Principal, userId: string, productId: string): Promise<Wishlist>;
  removeProduct(
    principal: Principal,
    userId: string,
    productId: string,
  ): Promise<Wishlist>;
}

function isDuplicateError(error: unknown): boolean {
  return error instanceof Error && error.message === "wishlist_duplicate";
}

function viewItem(
  productId: string,
  savedPriceMinor: number | null,
  product: WishlistCatalogProduct | null,
  inStock: boolean,
): WishlistViewItem {
  if (!product) {
    return {
      productId,
      savedPriceMinor,
      slug: null,
      name: null,
      brandName: null,
      href: null,
      image: null,
      listed: false,
      inStock: false,
      currentPriceMinor: null,
      issues: ["missing"],
    };
  }

  const issues: WishlistIssue[] = [];
  if (!product.listed) {
    issues.push("unavailable");
  } else if (!inStock) {
    issues.push("out_of_stock");
  }
  if (product.listPriceMinor !== savedPriceMinor) {
    issues.push("price_changed");
  }

  return {
    productId,
    savedPriceMinor,
    slug: product.slug,
    name: product.name,
    brandName: product.brandName,
    href: product.listed ? `/products/${product.slug}` : null,
    image: product.image,
    listed: product.listed,
    inStock,
    currentPriceMinor: product.listPriceMinor,
    issues,
  };
}

export function createWishlistServices(deps: {
  wishlists: WishlistRepository;
  catalog: WishlistCatalog;
  stock: WishlistStock;
}): WishlistServices {
  async function loadOrCreate(userId: string): Promise<Wishlist> {
    return (await deps.wishlists.getByUser(userId)) ?? deps.wishlists.create(userId);
  }

  return {
    async getWishlist(principal, userId) {
      assertCanReadCustomerResource(principal, userId);
      return loadOrCreate(userId);
    },

    async getWishlistView(principal, userId) {
      assertCanReadCustomerResource(principal, userId);
      const wishlist = await loadOrCreate(userId);
      const items: WishlistViewItem[] = [];
      for (const entry of wishlist.items) {
        const product = await deps.catalog.getProduct(entry.productId);
        const inStock =
          product !== null && product.listed && product.variantIds.length > 0
            ? await deps.stock.anyInStock(product.variantIds)
            : false;
        items.push(viewItem(entry.productId, entry.savedPriceMinor, product, inStock));
      }
      return { id: wishlist.id, userId: wishlist.userId, items };
    },

    async addProduct(principal, userId, productId) {
      assertCanWriteCustomerResource(principal, userId);
      const product = await deps.catalog.getProduct(productId);
      if (!product) {
        throw new NotFoundError("product not found", { productId });
      }
      const wishlist = await loadOrCreate(userId);
      try {
        return await deps.wishlists.save(
          addProduct(wishlist, productId, product.listPriceMinor),
        );
      } catch (error) {
        if (isDuplicateError(error)) {
          throw new ConflictError("product is already on the wishlist", { productId });
        }
        throw error;
      }
    },

    async removeProduct(principal, userId, productId) {
      assertCanWriteCustomerResource(principal, userId);
      const wishlist = await loadOrCreate(userId);
      return deps.wishlists.save(removeProduct(wishlist, productId));
    },
  };
}
