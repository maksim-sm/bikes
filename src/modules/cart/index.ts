/**
 * cart module — public entry point.
 *
 * Owns the cart aggregate and quantity rules. Does not decrement stock or
 * take payment; checkout calls `inventory` and `orders`.
 */

export {
  MAX_LINE_QUANTITY,
  MIN_LINE_QUANTITY,
  actorOwnsCart,
  addToLine,
  assertLineQuantity,
  type Cart,
  type CartActor,
  type CartLine,
} from "./domain/cart";
export type { CartCatalog, CartRepository } from "./application/ports";
export { createCartServices, type CartServices } from "./application/services";
export { createMemoryCartRepository } from "./infrastructure/memory-cart-repository";
