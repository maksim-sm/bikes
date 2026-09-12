/**
 * catalog module — public entry point.
 *
 * Owns products, variants, categories, brands, and specifications.
 * Stock lives in `inventory`. Displayed price lives in `pricing`.
 */

export { escapeIlike, productMatchesSearch, searchDocument } from "./domain/search";
export {
  BICYCLE_TYPES,
  findActiveVariant,
  isBicycleType,
  isListedOnStorefront,
  lowestListPriceMinor,
  normalizeProductSlug,
  publishProduct,
  unpublishProduct,
  type BicycleType,
  type Brand,
  type Category,
  type Product,
  type ProductImage,
  type ProductStatus,
  type ProductVariant,
  type ProductWriteInput,
} from "./domain/product";
export {
  CATALOG_SORT_FIELDS,
  type CatalogListFilters,
  type CatalogListQuery,
  type CatalogSortField,
} from "./application/list-query";
export type {
  CatalogInventory,
  CatalogListResult,
  CatalogRepository,
  Clock,
} from "./application/ports";
export { createCatalogServices, type CatalogServices } from "./application/services";
export {
  createCatalogAdminServices,
  type CatalogAdminServices,
} from "./application/admin-services";
export { createMemoryCatalogRepository } from "./infrastructure/memory-catalog-repository";
export {
  createDemoCatalogInventory,
  createDemoCatalogRepository,
  demoDraftFx,
  demoEmonda,
} from "./infrastructure/demo-catalog";
export { createPrismaCatalogRepository } from "./application/create-catalog";
