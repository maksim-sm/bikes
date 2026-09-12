/**
 * identity module — public entry point.
 *
 * Owns users, credentials, sessions, profiles, addresses, and wishlists.
 * Session cookies are httpOnly; raw tokens never leave this module as JSON.
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
  anonymousPrincipal,
  customerPrincipal,
  isAuthenticated,
  isStaff,
  staffPrincipal,
  type Principal,
} from "./domain/principal";
export {
  canReadCustomerResource,
  canReadOrder,
  hasCapability,
  hasStaffRole,
  isAnonymous,
  isCustomer,
} from "./domain/authorization";
export {
  STAFF_ROLES,
  isStaffRole,
  type Capability,
  type StaffRole,
} from "./domain/roles";
export {
  assertCanReadCustomerResource,
  assertCanReadOrder,
  assertCanWriteCustomerResource,
  requireAdmin,
  requireAnonymous,
  requireAuthenticated,
  requireCatalogRole,
  requireCustomer,
  requireInventoryRole,
  requireManager,
  requireOrderManagementRole,
  requireStaff,
} from "./application/authorization";
export {
  createSessionServices,
  type SessionPort,
  type SessionServices,
} from "./application/session-services";
export {
  createMemoryCustomerRepository,
  createMemoryWishlistRepository,
} from "./infrastructure/memory-customer-repository";
export { SESSION_COOKIE_NAME, MIN_PASSWORD_LENGTH, type AuthUser } from "./domain/auth";
export {
  clearedSessionCookie,
  readCookieValue,
  serializeCookie,
  sessionCookie,
  type SessionCookie,
} from "./domain/cookie";
export { createAuthServices, type AuthServices } from "./application/auth-services";
export {
  DEMO_STAFF_EMAIL,
  DEMO_STAFF_PASSWORD,
  createDemoAuthServices,
  createMemoryAuthServices,
  createPrismaAuthServices,
} from "./application/create-auth";
export type {
  AuthMailer,
  PasswordHasher,
  RateLimiter,
  SecurityLog,
} from "./application/auth-ports";
export { createCapturingMailer } from "./infrastructure/logging-mailer";
