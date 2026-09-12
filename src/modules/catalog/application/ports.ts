import type { Brand, Category, Product } from "../domain/product";
import type { CatalogListQuery } from "./list-query";

export interface Clock {
  now(): Date;
}

export interface CatalogListResult {
  items: Product[];
  total: number;
}

/**
 * Availability is owned by `inventory`. Catalog never reads `inventory_items`;
 * it only receives variant ids from this port.
 */
export interface CatalogInventory {
  listInStockVariantIds(): Promise<string[]>;
  listAvailabilityByVariantIds(
    variantIds: readonly string[],
  ): Promise<Array<{ variantId: string; available: number }>>;
}

export interface CatalogRepository {
  findBySlug(slug: string): Promise<Product | null>;
  listPublished(query: CatalogListQuery): Promise<CatalogListResult>;
  listCategories(): Promise<Category[]>;
  listBrands(): Promise<Brand[]>;
}
