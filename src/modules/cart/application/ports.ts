import type { Cart, CartActor } from "../domain/cart";

export interface CartRepository {
  findByActor(actor: CartActor): Promise<Cart | null>;
  findById(id: string): Promise<Cart | null>;
  create(actor: CartActor): Promise<Cart>;
  save(cart: Cart): Promise<Cart>;
  clear(id: string): Promise<void>;
  delete(cart: Cart): Promise<void>;
  transferToCustomer(cartId: string, userId: string): Promise<Cart>;
}

export interface CartVariantOption {
  variantId: string;
  frameSize: string;
  color: string;
  wheelSize: string;
  listPriceMinor: number;
  available: number;
  purchasable: boolean;
}

export interface CartVariantSnapshot {
  variantId: string;
  productId: string;
  productSlug: string;
  productName: string;
  brandName: string;
  frameSize: string;
  color: string;
  wheelSize: string;
  listPriceMinor: number;
  available: number;
  purchasable: boolean;
  siblings: CartVariantOption[];
}

export interface CartCatalog {
  variantIsPurchasable(variantId: string): Promise<boolean>;
  getVariantSnapshots(variantIds: readonly string[]): Promise<CartVariantSnapshot[]>;
}
