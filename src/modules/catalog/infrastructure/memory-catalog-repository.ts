import {
  descendantCategorySlugs,
  paginateListed,
  productMatchesListQuery,
  sortListedProducts,
} from "../application/list-match";
import type { CatalogListQuery } from "../application/list-query";
import type { CatalogRepository } from "../application/ports";
import type { Brand, Category, Product } from "../domain/product";

export function createMemoryCatalogRepository(input?: {
  products?: Product[];
  categories?: Category[];
  brands?: Brand[];
}): CatalogRepository {
  const products = input?.products ?? [];
  const categories = input?.categories ?? [];
  const brands = input?.brands ?? [];
  return {
    async findBySlug(slug) {
      return products.find((item) => item.slug === slug) ?? null;
    },
    async listPublished(query: CatalogListQuery) {
      let categorySlugs: string[] | null = null;
      if (query.filters.categorySlug) {
        if (categories.length === 0) {
          categorySlugs = [query.filters.categorySlug];
        } else {
          categorySlugs = descendantCategorySlugs(categories, query.filters.categorySlug);
          if (categorySlugs === null) {
            return { items: [], total: 0 };
          }
        }
      }
      const matched = products.filter((product) =>
        productMatchesListQuery(product, query, categorySlugs),
      );
      return paginateListed(sortListedProducts(matched, query), query);
    },
    async listCategories() {
      return [...categories].sort((left, right) => left.sortOrder - right.sortOrder);
    },
    async listBrands() {
      return [...brands].sort((left, right) => left.name.localeCompare(right.name, "ru"));
    },
  };
}
