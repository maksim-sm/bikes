/**
 * identity module — public entry point.
 *
 * Owns users, profiles, addresses, and wishlists. Customer and wishlist
 * operations are the public application services for those aggregates.
 */

export {
  assertProfileNames,
  prepareNewAddress,
  withSingleDefault,
  type Address,
  type CustomerProfile,
} from "./domain/customer";
export {
  addProduct,
  canAddProduct,
  removeProduct,
  type Wishlist,
} from "./domain/wishlist";
export type {
  CustomerRepository,
  WishlistCatalog,
  WishlistRepository,
} from "./application/ports";
export {
  createCustomerServices,
  type CustomerServices,
} from "./application/customer-services";
export {
  createWishlistServices,
  type WishlistServices,
} from "./application/wishlist-services";
