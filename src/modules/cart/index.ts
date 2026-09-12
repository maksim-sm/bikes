/**
 * cart module — public entry point.
 *
 * Owns the cart aggregate and quantity rules. Does not decrement stock or
 * take payment; checkout calls `inventory` and `orders`. Totals are always
 * recalculated from current catalogue prices via `pricing`.
 */

export {
  MAX_LINE_QUANTITY,
  MIN_LINE_QUANTITY,
  actorOwnsCart,
  addToLine,
  assertLineQuantity,
  mergeCartItems,
  removeLine,
  replaceLineVariant,
  type Cart,
  type CartActor,
  type CartLine,
} from "./domain/cart";
export type {
  CartCatalog,
  CartRepository,
  CartVariantOption,
  CartVariantSnapshot,
} from "./application/ports";
export { createCartServices, type CartServices } from "./application/services";
export type { CartLineIssue, CartLineView, CartView } from "./application/view";
export { createMemoryCartRepository } from "./infrastructure/memory-cart-repository";
export { createPrismaCartRepository } from "./application/create-cart";
