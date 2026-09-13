import { describe, expect, it } from "vitest";
import {
  bicycleTypePathSlug,
  catalogLandingPath,
  parseBicycleTypePathSlug,
  resolveCatalogSeo,
  sitemapCatalogLandingPaths,
} from "./facets";

describe("catalog landing paths", () => {
  it("keeps bicycle type slugs lowercase and rejects unknown types", () => {
    expect(bicycleTypePathSlug("ROAD")).toBe("road");
    expect(parseBicycleTypePathSlug("road")).toBe("ROAD");
    expect(parseBicycleTypePathSlug("ROAD")).toBe("ROAD");
    expect(parseBicycleTypePathSlug("roads")).toBeNull();
  });

  it("builds a closed sitemap set instead of a facet cartesian product", () => {
    const paths = sitemapCatalogLandingPaths({
      categorySlugs: ["bikes", "road"],
      brandSlugs: ["trek"],
    });
    expect(paths).toEqual([
      "/catalog",
      "/catalog/category/bikes",
      "/catalog/category/road",
      "/catalog/brand/trek",
      "/catalog/type/road",
      "/catalog/type/mtb",
      "/catalog/type/gravel",
      "/catalog/type/city",
      "/catalog/type/kids",
    ]);
    expect(paths.some((path) => path.includes("?"))).toBe(false);
    expect(paths).not.toContain("/catalog/category/road?brand=trek");
  });
});

describe("resolveCatalogSeo", () => {
  it("treats the unfiltered catalog as a self-canonical landing", () => {
    const decision = resolveCatalogSeo({ pathKind: "catalog" });
    expect(decision).toMatchObject({
      kind: "landing",
      canonicalPath: "/catalog",
      robots: { index: true, follow: true },
      filters: {},
    });
    expect(decision.redirectTo).toBeUndefined();
  });

  it("indexes a single category, brand, or type path landing", () => {
    expect(resolveCatalogSeo({ pathKind: "category", pathSlug: "road" })).toMatchObject({
      kind: "landing",
      landingSlug: "road",
      canonicalPath: "/catalog/category/road",
      robots: { index: true, follow: true },
      filters: { categorySlug: "road" },
    });
    expect(resolveCatalogSeo({ pathKind: "brand", pathSlug: "trek" })).toMatchObject({
      kind: "landing",
      canonicalPath: "/catalog/brand/trek",
      filters: { brandSlug: "trek" },
    });
    expect(resolveCatalogSeo({ pathKind: "type", pathSlug: "road" })).toMatchObject({
      kind: "landing",
      canonicalPath: "/catalog/type/road",
      filters: { bicycleType: "ROAD" },
    });
  });

  it("redirects query-string aliases of a single landing onto the path", () => {
    expect(
      resolveCatalogSeo({
        pathKind: "catalog",
        searchParams: { category: "road" },
      }).redirectTo,
    ).toBe("/catalog/category/road");
    expect(
      resolveCatalogSeo({
        pathKind: "catalog",
        searchParams: { brand: "Trek" },
      }).redirectTo,
    ).toBe("/catalog/brand/trek");
    expect(
      resolveCatalogSeo({
        pathKind: "catalog",
        searchParams: { bicycleType: "ROAD" },
      }).redirectTo,
    ).toBe("/catalog/type/road");
    expect(
      resolveCatalogSeo({
        pathKind: "catalog",
        searchParams: { category: "road", available: "true" },
      }).redirectTo,
    ).toBe("/catalog/category/road?available=true");
  });

  it("redirects default pagination, default sort, and path-case aliases", () => {
    expect(
      resolveCatalogSeo({
        pathKind: "catalog",
        searchParams: { page: "1" },
      }).redirectTo,
    ).toBe("/catalog");
    expect(
      resolveCatalogSeo({
        pathKind: "catalog",
        searchParams: { sort: "publishedAt", order: "desc" },
      }).redirectTo,
    ).toBe("/catalog");
    expect(resolveCatalogSeo({ pathKind: "type", pathSlug: "ROAD" }).redirectTo).toBe(
      "/catalog/type/road",
    );
    expect(
      resolveCatalogSeo({
        pathKind: "category",
        pathSlug: "road",
        searchParams: { category: "road" },
      }).redirectTo,
    ).toBe("/catalog/category/road");
  });

  it("noindexes combinations, search, price, availability, sort, and page > 1", () => {
    const combo = resolveCatalogSeo({
      pathKind: "catalog",
      searchParams: { category: "road", brand: "trek" },
    });
    expect(combo).toMatchObject({
      kind: "utility",
      canonicalPath: "/catalog",
      robots: { index: false, follow: true },
      filters: { categorySlug: "road", brandSlug: "trek" },
    });
    expect(combo.redirectTo).toBeUndefined();

    const onLanding = resolveCatalogSeo({
      pathKind: "category",
      pathSlug: "road",
      searchParams: { brand: "trek" },
    });
    expect(onLanding).toMatchObject({
      kind: "utility",
      canonicalPath: "/catalog/category/road",
      robots: { index: false, follow: true },
      filters: { categorySlug: "road", brandSlug: "trek" },
    });

    expect(
      resolveCatalogSeo({
        pathKind: "catalog",
        searchParams: { q: "emonda" },
      }),
    ).toMatchObject({
      kind: "utility",
      canonicalPath: "/catalog",
      robots: { index: false, follow: true },
      filters: { q: "emonda" },
    });
    expect(
      resolveCatalogSeo({
        pathKind: "brand",
        pathSlug: "trek",
        searchParams: { available: "true" },
      }),
    ).toMatchObject({
      kind: "utility",
      canonicalPath: "/catalog/brand/trek",
      robots: { index: false, follow: true },
    });
    expect(
      resolveCatalogSeo({
        pathKind: "catalog",
        searchParams: { page: "2" },
      }),
    ).toMatchObject({
      kind: "utility",
      canonicalPath: "/catalog",
      page: 2,
      robots: { index: false, follow: true },
    });
    expect(
      resolveCatalogSeo({
        pathKind: "catalog",
        searchParams: { sort: "price", order: "asc" },
      }),
    ).toMatchObject({
      kind: "utility",
      sort: { field: "price", direction: "asc" },
      robots: { index: false, follow: true },
    });
  });

  it("marks unknown type and malformed slugs as invalid instead of empty landings", () => {
    expect(resolveCatalogSeo({ pathKind: "type", pathSlug: "tandem" }).invalidPath).toBe(
      true,
    );
    expect(
      resolveCatalogSeo({ pathKind: "category", pathSlug: "Road Bikes" }).invalidPath,
    ).toBe(true);
    expect(catalogLandingPath("category", "road")).toBe("/catalog/category/road");
  });
});
