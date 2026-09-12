import { NotFoundError } from "@/lib/errors";
import { isListedOnStorefront, type Product } from "../domain/product";
import type { CatalogRepository, Clock } from "./ports";

export interface CatalogServices {
  listPublishedProducts(): Promise<Product[]>;
  getProductBySlug(slug: string): Promise<Product>;
}

export function createCatalogServices(deps: {
  catalog: CatalogRepository;
  clock: Clock;
}): CatalogServices {
  return {
    async listPublishedProducts() {
      return deps.catalog.listPublished(deps.clock.now());
    },

    async getProductBySlug(slug: string) {
      const product = await deps.catalog.findBySlug(slug);
      if (!product || !isListedOnStorefront(product, deps.clock.now())) {
        throw new NotFoundError("product not found", { slug });
      }
      return product;
    },
  };
}
