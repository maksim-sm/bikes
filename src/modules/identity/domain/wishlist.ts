export interface Wishlist {
  id: string;
  userId: string;
  productIds: string[];
}

export function canAddProduct(wishlist: Wishlist, productId: string): boolean {
  return !wishlist.productIds.includes(productId);
}

export function addProduct(wishlist: Wishlist, productId: string): Wishlist {
  if (!canAddProduct(wishlist, productId)) {
    throw new Error("wishlist_duplicate");
  }
  return { ...wishlist, productIds: [...wishlist.productIds, productId] };
}

export function removeProduct(wishlist: Wishlist, productId: string): Wishlist {
  return {
    ...wishlist,
    productIds: wishlist.productIds.filter((id) => id !== productId),
  };
}
