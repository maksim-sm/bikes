/**
 * Faceted-navigation SEO policy (ADR-0036).
 *
 * Indexable URLs are a closed set of path landings. Query-string filters never
 * enter the sitemap and never become self-canonical. Combinations stay
 * `noindex, follow` so we do not mint a cartesian product of crawlable pages.
 */
import {
  BICYCLE_TYPES,
  CATALOG_SORT_FIELDS,
  isBicycleType,
  PRODUCT_SLUG_PATTERN,
  type BicycleType,
  type CatalogListFilters,
  type CatalogSortField,
} from "@/modules/catalog";

export const CATALOG_PATH = "/catalog";
/** Storefront listing page size. `page>1` is noindex (see `resolveCatalogSeo`). */
export const CATALOG_PAGE_SIZE = 24;

export type LandingDimension = "category" | "brand" | "type";
export type CatalogPathKind = "catalog" | LandingDimension;

export const indexFollowRobots = { index: true, follow: true } as const;
export const noIndexFollowRobots = { index: false, follow: true } as const;

export type CatalogSearchParams = Record<string, string | string[] | undefined>;

export interface CatalogSeoDecision {
  kind: "landing" | "utility";
  pathKind: CatalogPathKind;
  landingSlug?: string;
  filters: CatalogListFilters;
  page: number;
  sort: { field: CatalogSortField; direction: "asc" | "desc" };
  canonicalPath: string;
  robots: { index: boolean; follow: boolean };
  redirectTo?: string;
  invalidPath?: boolean;
}

export function bicycleTypePathSlug(type: BicycleType): string {
  return type.toLowerCase();
}

export function parseBicycleTypePathSlug(value: string): BicycleType | null {
  const asType = value.trim().toUpperCase();
  return isBicycleType(asType) ? asType : null;
}

export function catalogLandingPath(dimension?: LandingDimension, slug?: string): string {
  if (!dimension || !slug) {
    return CATALOG_PATH;
  }
  return `${CATALOG_PATH}/${dimension}/${slug}`;
}

/** Closed sitemap set: `/catalog` + one URL per category, brand, and bicycle type. */
export function sitemapCatalogLandingPaths(input: {
  categorySlugs: readonly string[];
  brandSlugs: readonly string[];
}): string[] {
  return [
    CATALOG_PATH,
    ...input.categorySlugs.map((slug) => catalogLandingPath("category", slug)),
    ...input.brandSlugs.map((slug) => catalogLandingPath("brand", slug)),
    ...BICYCLE_TYPES.map((type) => catalogLandingPath("type", bicycleTypePathSlug(type))),
  ];
}

export function requestCatalogPath(pathKind: CatalogPathKind, pathSlug?: string): string {
  if (pathKind === "catalog") {
    return CATALOG_PATH;
  }
  return catalogLandingPath(pathKind, pathSlug ?? "");
}

function firstValue(params: CatalogSearchParams, key: string): string | undefined {
  const raw = params[key];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined) {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeLandingSlug(value: string): string {
  return value.trim().toLowerCase();
}

function isValidLandingSlug(value: string): boolean {
  return PRODUCT_SLUG_PATTERN.test(value);
}

function parseAvailable(value: string | undefined): boolean | undefined {
  if (value === "true" || value === "1") {
    return true;
  }
  if (value === "false" || value === "0") {
    return false;
  }
  return undefined;
}

function parseIntParam(value: string | undefined): number | undefined {
  if (value === undefined || !/^\d+$/.test(value)) {
    return undefined;
  }
  return Number.parseInt(value, 10);
}

function isSortField(value: string): value is CatalogSortField {
  return (CATALOG_SORT_FIELDS as readonly string[]).includes(value);
}

function withQuery(path: string, query: URLSearchParams): string {
  const serialized = query.toString();
  return serialized.length > 0 ? `${path}?${serialized}` : path;
}

function setIf(query: URLSearchParams, key: string, value: string | undefined): void {
  if (value !== undefined && value.length > 0) {
    query.set(key, value);
  }
}

export function resolveCatalogSeo(input: {
  pathKind: CatalogPathKind;
  pathSlug?: string;
  searchParams?: CatalogSearchParams;
}): CatalogSeoDecision {
  const params = input.searchParams ?? {};
  const pathKind = input.pathKind;

  let invalidPath = false;
  let pathSlugCanonical: string | undefined;

  if (pathKind !== "catalog") {
    const raw = input.pathSlug ?? "";
    if (pathKind === "type") {
      const type = parseBicycleTypePathSlug(raw);
      if (!type) {
        invalidPath = true;
      } else {
        pathSlugCanonical = bicycleTypePathSlug(type);
      }
    } else {
      const normalized = normalizeLandingSlug(raw);
      if (!isValidLandingSlug(normalized)) {
        invalidPath = true;
      } else {
        pathSlugCanonical = normalized;
      }
    }
  }

  const queryCategoryRaw = firstValue(params, "category");
  const queryBrandRaw = firstValue(params, "brand");
  const typeQuery = firstValue(params, "type");
  const bicycleTypeQuery = firstValue(params, "bicycleType");
  const queryTypeRaw = typeQuery ?? bicycleTypeQuery;

  const queryCategory =
    queryCategoryRaw && isValidLandingSlug(normalizeLandingSlug(queryCategoryRaw))
      ? normalizeLandingSlug(queryCategoryRaw)
      : undefined;
  const queryBrand =
    queryBrandRaw && isValidLandingSlug(normalizeLandingSlug(queryBrandRaw))
      ? normalizeLandingSlug(queryBrandRaw)
      : undefined;
  const queryType = queryTypeRaw ? parseBicycleTypePathSlug(queryTypeRaw) : null;
  const queryTypeSlug = queryType ? bicycleTypePathSlug(queryType) : undefined;

  const categoryFromPath = pathKind === "category" ? pathSlugCanonical : undefined;
  const brandFromPath = pathKind === "brand" ? pathSlugCanonical : undefined;
  const typeFromPath =
    pathKind === "type" && pathSlugCanonical
      ? parseBicycleTypePathSlug(pathSlugCanonical)
      : null;

  const categorySlug = categoryFromPath ?? queryCategory;
  const brandSlug = brandFromPath ?? queryBrand;
  const bicycleType = typeFromPath ?? queryType;

  const q = firstValue(params, "q");
  const frameSize = firstValue(params, "frameSize");
  const wheelSize = firstValue(params, "wheelSize");
  const frameMaterial = firstValue(params, "frameMaterial");
  const groupset = firstValue(params, "groupset");
  const brakeType = firstValue(params, "brakeType");
  const available = parseAvailable(firstValue(params, "available"));
  const minPriceMinor = parseIntParam(firstValue(params, "minPrice"));
  const maxPriceMinor = parseIntParam(firstValue(params, "maxPrice"));
  const pageRaw = parseIntParam(firstValue(params, "page"));
  const page = pageRaw !== undefined && pageRaw >= 1 ? pageRaw : 1;
  const pageInQuery = firstValue(params, "page") !== undefined;

  const defaultSortField: CatalogSortField = q ? "relevance" : "publishedAt";
  const sortRaw = firstValue(params, "sort");
  const sortField: CatalogSortField =
    sortRaw && isSortField(sortRaw) ? sortRaw : defaultSortField;
  const orderRaw = firstValue(params, "order");
  const sortDirection: "asc" | "desc" = orderRaw === "asc" ? "asc" : "desc";
  const sortInQuery = sortRaw !== undefined || orderRaw !== undefined;

  const filters: CatalogListFilters = {
    ...(categorySlug ? { categorySlug } : {}),
    ...(brandSlug ? { brandSlug } : {}),
    ...(bicycleType ? { bicycleType } : {}),
    ...(q ? { q } : {}),
    ...(frameSize ? { frameSize } : {}),
    ...(wheelSize ? { wheelSize } : {}),
    ...(frameMaterial ? { frameMaterial } : {}),
    ...(groupset ? { groupset } : {}),
    ...(brakeType ? { brakeType } : {}),
    ...(available !== undefined ? { available } : {}),
    ...(minPriceMinor !== undefined ? { minPriceMinor } : {}),
    ...(maxPriceMinor !== undefined ? { maxPriceMinor } : {}),
  };

  const hasUtility =
    q !== undefined ||
    frameSize !== undefined ||
    wheelSize !== undefined ||
    frameMaterial !== undefined ||
    groupset !== undefined ||
    brakeType !== undefined ||
    available !== undefined ||
    minPriceMinor !== undefined ||
    maxPriceMinor !== undefined ||
    page > 1 ||
    sortField !== defaultSortField ||
    sortDirection !== "desc";

  const extraCategory = pathKind === "category" ? undefined : queryCategory;
  const extraBrand = pathKind === "brand" ? undefined : queryBrand;
  const extraType = pathKind === "type" ? undefined : queryTypeSlug;
  const extraLandingCount = [extraCategory, extraBrand, extraType].filter(Boolean).length;
  const landingCount = [categorySlug, brandSlug, bicycleType].filter(Boolean).length;

  const pathLanding =
    pathKind === "catalog" || !pathSlugCanonical
      ? CATALOG_PATH
      : catalogLandingPath(pathKind, pathSlugCanonical);

  const promoteSingleQueryLanding = pathKind === "catalog" && extraLandingCount === 1;
  const promotedPath = promoteSingleQueryLanding
    ? extraCategory
      ? catalogLandingPath("category", extraCategory)
      : extraBrand
        ? catalogLandingPath("brand", extraBrand)
        : extraType
          ? catalogLandingPath("type", extraType)
          : CATALOG_PATH
    : pathLanding;

  const canonicalPath = promotedPath;

  const isIndexableLanding =
    !invalidPath &&
    !hasUtility &&
    extraLandingCount === (promoteSingleQueryLanding ? 1 : 0) &&
    (pathKind === "catalog"
      ? promoteSingleQueryLanding || landingCount === 0
      : landingCount === 1 && pathSlugCanonical !== undefined);

  // After a promote redirect the destination is the indexable landing. The
  // query URL itself is never indexed — we 308 away from it.
  const robots =
    isIndexableLanding && !promoteSingleQueryLanding
      ? indexFollowRobots
      : noIndexFollowRobots;
  const kind = isIndexableLanding && !promoteSingleQueryLanding ? "landing" : "utility";

  const cleanQuery = new URLSearchParams();
  if (!promoteSingleQueryLanding) {
    setIf(cleanQuery, "category", extraCategory);
    setIf(cleanQuery, "brand", extraBrand);
    setIf(cleanQuery, "type", extraType);
  }
  setIf(cleanQuery, "q", q);
  if (available !== undefined) {
    cleanQuery.set("available", available ? "true" : "false");
  }
  setIf(cleanQuery, "frameSize", frameSize);
  setIf(cleanQuery, "wheelSize", wheelSize);
  setIf(cleanQuery, "frameMaterial", frameMaterial);
  setIf(cleanQuery, "groupset", groupset);
  setIf(cleanQuery, "brakeType", brakeType);
  if (minPriceMinor !== undefined) {
    cleanQuery.set("minPrice", String(minPriceMinor));
  }
  if (maxPriceMinor !== undefined) {
    cleanQuery.set("maxPrice", String(maxPriceMinor));
  }
  if (page > 1) {
    cleanQuery.set("page", String(page));
  }
  if (sortField !== defaultSortField) {
    cleanQuery.set("sort", sortField);
  }
  if (sortDirection !== "desc") {
    cleanQuery.set("order", sortDirection);
  }

  const requestedQuery = new URLSearchParams();
  setIf(
    requestedQuery,
    "category",
    queryCategoryRaw ? normalizeLandingSlug(queryCategoryRaw) : undefined,
  );
  setIf(
    requestedQuery,
    "brand",
    queryBrandRaw ? normalizeLandingSlug(queryBrandRaw) : undefined,
  );
  if (typeQuery && queryTypeSlug) {
    requestedQuery.set("type", typeQuery.trim().toLowerCase());
  } else if (bicycleTypeQuery && queryTypeSlug) {
    requestedQuery.set("bicycleType", bicycleTypeQuery);
  }
  setIf(requestedQuery, "q", q);
  if (available !== undefined) {
    requestedQuery.set("available", firstValue(params, "available") ?? "true");
  }
  setIf(requestedQuery, "frameSize", frameSize);
  setIf(requestedQuery, "wheelSize", wheelSize);
  setIf(requestedQuery, "frameMaterial", frameMaterial);
  setIf(requestedQuery, "groupset", groupset);
  setIf(requestedQuery, "brakeType", brakeType);
  if (minPriceMinor !== undefined) {
    requestedQuery.set(
      "minPrice",
      firstValue(params, "minPrice") ?? String(minPriceMinor),
    );
  }
  if (maxPriceMinor !== undefined) {
    requestedQuery.set(
      "maxPrice",
      firstValue(params, "maxPrice") ?? String(maxPriceMinor),
    );
  }
  if (pageInQuery) {
    requestedQuery.set("page", firstValue(params, "page") ?? "1");
  }
  if (sortInQuery && sortRaw) {
    requestedQuery.set("sort", sortRaw);
  }
  if (sortInQuery && orderRaw) {
    requestedQuery.set("order", orderRaw);
  }

  const requestedUrl = withQuery(
    requestCatalogPath(pathKind, input.pathSlug),
    requestedQuery,
  );
  const cleanUrl = withQuery(promotedPath, cleanQuery);
  const redirectTo = !invalidPath && requestedUrl !== cleanUrl ? cleanUrl : undefined;

  return {
    kind,
    pathKind,
    ...(pathSlugCanonical ? { landingSlug: pathSlugCanonical } : {}),
    filters,
    page,
    sort: { field: sortField, direction: sortDirection },
    canonicalPath,
    robots,
    ...(redirectTo ? { redirectTo } : {}),
    ...(invalidPath ? { invalidPath: true } : {}),
  };
}

/** Current listing URL for pagination. Keeps utility filters; omits `page=1`. */
export function catalogViewHref(decision: CatalogSeoDecision, page: number): string {
  const path =
    decision.pathKind === "catalog" || !decision.landingSlug
      ? CATALOG_PATH
      : catalogLandingPath(decision.pathKind, decision.landingSlug);
  const query = new URLSearchParams();
  if (decision.pathKind !== "category" && decision.filters.categorySlug) {
    query.set("category", decision.filters.categorySlug);
  }
  if (decision.pathKind !== "brand" && decision.filters.brandSlug) {
    query.set("brand", decision.filters.brandSlug);
  }
  if (decision.pathKind !== "type" && decision.filters.bicycleType) {
    query.set("type", bicycleTypePathSlug(decision.filters.bicycleType));
  }
  setIf(query, "q", decision.filters.q);
  if (decision.filters.available !== undefined) {
    query.set("available", decision.filters.available ? "true" : "false");
  }
  setIf(query, "frameSize", decision.filters.frameSize);
  setIf(query, "wheelSize", decision.filters.wheelSize);
  setIf(query, "frameMaterial", decision.filters.frameMaterial);
  setIf(query, "groupset", decision.filters.groupset);
  setIf(query, "brakeType", decision.filters.brakeType);
  if (decision.filters.minPriceMinor !== undefined) {
    query.set("minPrice", String(decision.filters.minPriceMinor));
  }
  if (decision.filters.maxPriceMinor !== undefined) {
    query.set("maxPrice", String(decision.filters.maxPriceMinor));
  }
  if (page > 1) {
    query.set("page", String(page));
  }
  const defaultSortField: CatalogSortField = decision.filters.q
    ? "relevance"
    : "publishedAt";
  if (decision.sort.field !== defaultSortField) {
    query.set("sort", decision.sort.field);
  }
  if (decision.sort.direction !== "desc") {
    query.set("order", decision.sort.direction);
  }
  return withQuery(path, query);
}
