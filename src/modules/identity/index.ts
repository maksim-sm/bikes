/**
 * identity module — public entry point.
 *
 * Owns users, profiles, addresses, wishlists, and request principals.
 * Customer and wishlist operations are application services. Session
 * resolution is a port so Route Handlers never read tokens themselves.
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
export {
  actorUserId,
  isAuthenticated,
  isStaff,
  parseBearerPrincipal,
  type Principal,
} from "./domain/principal";
export {
  createBearerSessionPort,
  createSessionServices,
  type SessionPort,
  type SessionServices,
} from "./application/session-services";
