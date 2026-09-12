import {
  isListedOnStorefront,
  lowestListPriceMinor,
  type Category,
  type Product,
} from "../domain/product";
import type { CatalogListQuery } from "./list-query";
import type { CatalogListResult } from "./ports";

export function descendantCategorySlugs(
  categories: readonly Category[],
  rootSlug: string,
): string[] | null {
  const root = categories.find((category) => category.slug === rootSlug);
  if (!root) {
    return null;
  }
  const slugs = new Set<string>([root.slug]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const category of categories) {
      if (
        category.parentSlug !== null &&
        slugs.has(category.parentSlug) &&
        !slugs.has(category.slug)
      ) {
        slugs.add(category.slug);
        grew = true;
      }
    }
  }
  return [...slugs];
}

export function productMatchesListQuery(
  product: Product,
  query: CatalogListQuery,
  categorySlugs: string[] | null,
): boolean {
  if (!isListedOnStorefront(product, query.now)) {
    return false;
  }
  const { filters } = query;
  if (categorySlugs !== null && !categorySlugs.includes(product.categorySlug)) {
    return false;
  }
  if (filters.brandSlug && product.brandSlug !== filters.brandSlug) {
    return false;
  }
  if (filters.bicycleType && product.bicycleType !== filters.bicycleType) {
    return false;
  }
  if (filters.frameMaterial && product.frameMaterial !== filters.frameMaterial) {
    return false;
  }
  if (filters.groupset && product.groupset !== filters.groupset) {
    return false;
  }
  if (filters.brakeType && product.brakeType !== filters.brakeType) {
    return false;
  }
  if (filters.q) {
    const needle = filters.q.toLowerCase();
    const hay = `${product.name} ${product.brandName}`.toLowerCase();
    if (!hay.includes(needle)) {
      return false;
    }
  }
  const active = product.variants.filter((variant) => variant.isActive);
  if (active.length === 0) {
    return false;
  }
  const matching = active.filter((variant) => {
    if (filters.frameSize && variant.frameSize !== filters.frameSize) {
      return false;
    }
    if (filters.wheelSize && variant.wheelSize !== filters.wheelSize) {
      return false;
    }
    if (
      filters.minPriceMinor !== undefined &&
      variant.listPriceMinor < filters.minPriceMinor
    ) {
      return false;
    }
    if (
      filters.maxPriceMinor !== undefined &&
      variant.listPriceMinor > filters.maxPriceMinor
    ) {
      return false;
    }
    return true;
  });
  if (matching.length === 0) {
    return false;
  }
  const inStock = new Set(query.availableVariantIds ?? []);
  if (filters.available === true) {
    return matching.some((variant) => inStock.has(variant.id));
  }
  if (filters.available === false) {
    return matching.every((variant) => !inStock.has(variant.id));
  }
  return true;
}

export function sortListedProducts(items: Product[], query: CatalogListQuery): Product[] {
  const copy = [...items];
  const direction = query.sort.direction === "asc" ? 1 : -1;
  copy.sort((left, right) => {
    if (query.sort.field === "name") {
      return left.name.localeCompare(right.name, "ru") * direction;
    }
    if (query.sort.field === "price") {
      const lp = lowestListPriceMinor(left) ?? 0;
      const rp = lowestListPriceMinor(right) ?? 0;
      return (lp - rp) * direction;
    }
    const lt = left.publishedAt?.getTime() ?? 0;
    const rt = right.publishedAt?.getTime() ?? 0;
    return (lt - rt) * direction;
  });
  return copy;
}

export function paginateListed(
  items: readonly Product[],
  query: CatalogListQuery,
): CatalogListResult {
  const start = (query.page - 1) * query.pageSize;
  return {
    items: items.slice(start, start + query.pageSize),
    total: items.length,
  };
}
