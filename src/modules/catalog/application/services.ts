import { NotFoundError } from "@/lib/errors";
import {
  isListedOnStorefront,
  normalizeProductSlug,
  type Brand,
  type Category,
  type Product,
} from "../domain/product";
import type { CatalogListQuery } from "./list-query";
import type {
  CatalogInventory,
  CatalogListResult,
  CatalogRepository,
  Clock,
} from "./ports";

export interface CatalogServices {
  listPublishedProducts(query: Omit<CatalogListQuery, "now">): Promise<CatalogListResult>;
  getProductBySlug(slug: string): Promise<Product>;
  listCategories(): Promise<Category[]>;
  listBrands(): Promise<Brand[]>;
}

export function createCatalogServices(deps: {
  catalog: CatalogRepository;
  clock: Clock;
  inventory?: CatalogInventory;
}): CatalogServices {
  return {
    async listPublishedProducts(query) {
      const available =
        query.filters.available === undefined || !deps.inventory
          ? undefined
          : await deps.inventory.listInStockVariantIds();
      return deps.catalog.listPublished({
        ...query,
        now: deps.clock.now(),
        ...(available !== undefined ? { availableVariantIds: available } : {}),
      });
    },

    async getProductBySlug(slug: string) {
      const product = await deps.catalog.findBySlug(normalizeProductSlug(slug));
      if (!product || !isListedOnStorefront(product, deps.clock.now())) {
        throw new NotFoundError("product not found", { slug });
      }
      return product;
    },

    async listCategories() {
      return deps.catalog.listCategories();
    },

    async listBrands() {
      return deps.catalog.listBrands();
    },
  };
}
