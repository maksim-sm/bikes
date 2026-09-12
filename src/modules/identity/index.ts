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
  productIds,
  removeProduct,
  type Wishlist,
  type WishlistEntry,
} from "./domain/wishlist";
export type {
  CustomerRepository,
  WishlistCatalog,
  WishlistCatalogProduct,
  WishlistRepository,
  WishlistStock,
} from "./application/ports";
export {
  createCustomerServices,
  type CustomerServices,
} from "./application/customer-services";
export {
  createWishlistServices,
  type WishlistIssue,
  type WishlistServices,
  type WishlistView,
  type WishlistViewItem,
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
export {
  MIN_PASSWORD_LENGTH,
  SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  STAFF_SESSION_IDLE_MS,
  STAFF_SESSION_MAX_MS,
  isSessionActive,
  sessionPolicyFor,
  type AuthUser,
  type SessionPolicy,
  type StoredSession,
} from "./domain/auth";
export {
  clearedSessionCookie,
  readCookieValue,
  serializeCookie,
  sessionCookie,
  type HttpOnlyCookie,
  type SessionCookie,
} from "./domain/cookie";
export { createAuthServices, type AuthServices } from "./application/auth-services";
export {
  DEMO_CUSTOMER_EMAIL,
  DEMO_CUSTOMER_ID,
  DEMO_CUSTOMER_PASSWORD,
  DEMO_STAFF_EMAIL,
  DEMO_STAFF_PASSWORD,
  createDemoAuthServices,
  createMemoryAuthServices,
  createPrismaAuthServices,
} from "./application/create-auth";
export { createPrismaCustomerRepository } from "./infrastructure/prisma-customer-repository";
export { createPrismaWishlistRepository } from "./infrastructure/prisma-wishlist-repository";
export type {
  AuthMailer,
  PasswordHasher,
  RateLimiter,
  SecurityLog,
} from "./application/auth-ports";
export { createCapturingMailer } from "./infrastructure/logging-mailer";
