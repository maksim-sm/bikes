export interface WishlistEntry {
  productId: string;
  savedPriceMinor: number | null;
}

export interface Wishlist {
  id: string;
  userId: string;
  items: WishlistEntry[];
}

export function productIds(wishlist: Wishlist): string[] {
  return wishlist.items.map((item) => item.productId);
}

export function canAddProduct(wishlist: Wishlist, productId: string): boolean {
  return !wishlist.items.some((item) => item.productId === productId);
}

export function addProduct(
  wishlist: Wishlist,
  productId: string,
  savedPriceMinor: number | null,
): Wishlist {
  if (!canAddProduct(wishlist, productId)) {
    throw new Error("wishlist_duplicate");
  }
  return {
    ...wishlist,
    items: [...wishlist.items, { productId, savedPriceMinor }],
  };
}

export function removeProduct(wishlist: Wishlist, productId: string): Wishlist {
  return {
    ...wishlist,
    items: wishlist.items.filter((item) => item.productId !== productId),
  };
}
