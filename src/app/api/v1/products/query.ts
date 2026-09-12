import { z } from "zod";
import { ValidationError } from "@/lib/errors";
import {
  parseFilters,
  parsePageQuery,
  parseSortQuery,
  parseWithSchema,
  searchParamsObject,
} from "@/lib/http";
import {
  BICYCLE_TYPES,
  CATALOG_SORT_FIELDS,
  createCatalogServices,
  isBicycleType,
  type CatalogInventory,
  type CatalogListFilters,
  type CatalogRepository,
} from "@/modules/catalog";
import {
  toProductDetailDto,
  toProductListDto,
  type ProductDetailDto,
  type ProductListDto,
} from "./dto";

export const PRODUCT_FILTER_KEYS = [
  "category",
  "brand",
  "bicycleType",
  "frameSize",
  "wheelSize",
  "minPrice",
  "maxPrice",
  "available",
  "q",
  "frameMaterial",
  "groupset",
  "brakeType",
] as const;

const filterSchema = z.object({
  category: z.string().min(1).max(120).optional(),
  brand: z.string().min(1).max(120).optional(),
  bicycleType: z
    .string()
    .transform((value) => value.toUpperCase())
    .refine((value) => isBicycleType(value), {
      message: `bicycleType: must be one of ${BICYCLE_TYPES.join(", ")}`,
    })
    .optional(),
  frameSize: z.string().min(1).max(16).optional(),
  wheelSize: z.string().min(1).max(16).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  available: z.enum(["true", "false", "1", "0"]).optional(),
  q: z.string().min(1).max(120).optional(),
  frameMaterial: z.string().min(1).max(80).optional(),
  groupset: z.string().min(1).max(80).optional(),
  brakeType: z.string().min(1).max(40).optional(),
});

export interface ProductListResult {
  data: ProductListDto[];
  meta: { page: number; pageSize: number; total: number };
}

export function parseProductListQuery(url: URL): {
  page: number;
  pageSize: number;
  sort: { field: (typeof CATALOG_SORT_FIELDS)[number]; direction: "asc" | "desc" };
  filters: CatalogListFilters;
} {
  const query = searchParamsObject(url);
  const page = parsePageQuery(query);
  const raw = parseFilters(query, PRODUCT_FILTER_KEYS);
  const parsed = parseWithSchema(filterSchema, raw);
  if (
    parsed.minPrice !== undefined &&
    parsed.maxPrice !== undefined &&
    parsed.minPrice > parsed.maxPrice
  ) {
    throw new ValidationError("minPrice must be less than or equal to maxPrice");
  }
  const available =
    parsed.available === undefined
      ? undefined
      : parsed.available === "true" || parsed.available === "1";
  const bicycleType =
    parsed.bicycleType !== undefined && isBicycleType(parsed.bicycleType)
      ? parsed.bicycleType
      : undefined;
  return {
    page: page.page,
    pageSize: page.pageSize,
    sort: parseSortQuery(query, CATALOG_SORT_FIELDS, {
      field: "publishedAt",
      direction: "desc",
    }),
    filters: {
      ...(parsed.category !== undefined ? { categorySlug: parsed.category } : {}),
      ...(parsed.brand !== undefined ? { brandSlug: parsed.brand } : {}),
      ...(bicycleType !== undefined ? { bicycleType } : {}),
      ...(parsed.frameSize !== undefined ? { frameSize: parsed.frameSize } : {}),
      ...(parsed.wheelSize !== undefined ? { wheelSize: parsed.wheelSize } : {}),
      ...(parsed.minPrice !== undefined ? { minPriceMinor: parsed.minPrice } : {}),
      ...(parsed.maxPrice !== undefined ? { maxPriceMinor: parsed.maxPrice } : {}),
      ...(available !== undefined ? { available } : {}),
      ...(parsed.q !== undefined ? { q: parsed.q } : {}),
      ...(parsed.frameMaterial !== undefined
        ? { frameMaterial: parsed.frameMaterial }
        : {}),
      ...(parsed.groupset !== undefined ? { groupset: parsed.groupset } : {}),
      ...(parsed.brakeType !== undefined ? { brakeType: parsed.brakeType } : {}),
    },
  };
}

export async function listProductsHttp(
  catalog: CatalogRepository,
  now: Date,
  url: URL,
  inventory?: CatalogInventory,
): Promise<ProductListResult> {
  const parsed = parseProductListQuery(url);
  const services = createCatalogServices({
    catalog,
    clock: { now: () => now },
    ...(inventory !== undefined ? { inventory } : {}),
  });
  const listed = await services.listPublishedProducts(parsed);
  return {
    data: listed.items.map(toProductListDto),
    meta: {
      page: parsed.page,
      pageSize: parsed.pageSize,
      total: listed.total,
    },
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
