/**
 * catalog module — public entry point.
 *
 * Owns products, variants, categories, and specifications.
 * Stock lives in `inventory`. Displayed price lives in `pricing`.
 */

export {
  findActiveVariant,
  isListedOnStorefront,
  type Product,
  type ProductStatus,
  type ProductVariant,
} from "./domain/product";
export type { CatalogRepository, Clock } from "./application/ports";
export { createCatalogServices, type CatalogServices } from "./application/services";
