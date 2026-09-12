import type { Cart, CartActor } from "../domain/cart";

export interface CartRepository {
  findByActor(actor: CartActor): Promise<Cart | null>;
  create(actor: CartActor): Promise<Cart>;
  save(cart: Cart): Promise<Cart>;
}

export interface CartCatalog {
  variantIsPurchasable(variantId: string): Promise<boolean>;
}
