import type { BicycleType } from "../domain/product";

export const CATALOG_SORT_FIELDS = ["name", "publishedAt", "price", "relevance"] as const;
export type CatalogSortField = (typeof CATALOG_SORT_FIELDS)[number];

export interface CatalogListFilters {
  categorySlug?: string;
  brandSlug?: string;
  bicycleType?: BicycleType;
  frameSize?: string;
  wheelSize?: string;
  minPriceMinor?: number;
  maxPriceMinor?: number;
  q?: string;
  frameMaterial?: string;
  groupset?: string;
  brakeType?: string;
  available?: boolean;
}

export interface CatalogListQuery {
  now: Date;
  page: number;
  pageSize: number;
  sort: { field: CatalogSortField; direction: "asc" | "desc" };
  filters: CatalogListFilters;
  /**
   * Variant ids from inventory. Set when `filters.available` is present.
   * Catalog applies them in SQL / the memory equivalent; it does not join stock.
   */
  availableVariantIds?: string[];
}
