import type { Product } from "../domain/product";

export interface Clock {
  now(): Date;
}

export interface CatalogRepository {
  findBySlug(slug: string): Promise<Product | null>;
  listPublished(now: Date): Promise<Product[]>;
}
