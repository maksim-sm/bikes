import {
  compareBy,
  paginate,
  parseFilters,
  parsePageQuery,
  parseSortQuery,
  searchParamsObject,
} from "@/lib/http";
import {
  createCatalogServices,
  type CatalogRepository,
  type Product,
} from "@/modules/catalog";
import {
  toProductDetailDto,
  toProductListDto,
  type ProductDetailDto,
  type ProductListDto,
} from "./dto";

const SORT_FIELDS = ["name", "publishedAt"] as const;
type ProductSort = (typeof SORT_FIELDS)[number];

export interface ProductListResult {
  data: ProductListDto[];
  meta: { page: number; pageSize: number; total: number };
}

export async function listProductsHttp(
  catalog: CatalogRepository,
  now: Date,
  url: URL,
): Promise<ProductListResult> {
  const query = searchParamsObject(url);
  const page = parsePageQuery(query);
  const filters = parseFilters(query, ["category", "q"]);
  const sort = parseSortQuery(query, SORT_FIELDS, {
    field: "publishedAt",
    direction: "desc",
  });
  const services = createCatalogServices({ catalog, clock: { now: () => now } });

  const products = await services.listPublishedProducts();
  const filtered = products.filter((item) => matchesFilters(item, filters));
  filtered.sort((left, right) => compareProduct(left, right, sort.field, sort.direction));
  const sliced = paginate(filtered, page);
  return {
    data: sliced.items.map(toProductListDto),
    meta: sliced.meta,
  };
}

export async function getProductHttp(
  catalog: CatalogRepository,
  now: Date,
  slug: string,
): Promise<ProductDetailDto> {
  const services = createCatalogServices({ catalog, clock: { now: () => now } });
  return toProductDetailDto(await services.getProductBySlug(slug));
}

function matchesFilters(product: Product, filters: Record<string, string>): boolean {
  if (filters.category && product.categorySlug !== filters.category) {
    return false;
  }
  if (filters.q && !product.name.toLowerCase().includes(filters.q.toLowerCase())) {
    return false;
  }
  return true;
}

function compareProduct(
  left: Product,
  right: Product,
  field: ProductSort,
  direction: "asc" | "desc",
): number {
  if (field === "name") {
    return compareBy(left, right, (item) => item.name, direction);
  }
  return compareBy(left, right, (item) => item.publishedAt, direction);
}
