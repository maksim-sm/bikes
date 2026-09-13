import { describe, expect, it } from "vitest";
import type { Category, Product, ProductVariant } from "../domain/product";
import type { CatalogListQuery } from "./list-query";
import {
  descendantCategorySlugs,
  paginateListed,
  productMatchesListQuery,
  sortListedProducts,
} from "./list-match";

const now = new Date("2026-09-13T12:00:00.000Z");

const categories: Category[] = [
  { slug: "bikes", name: "Велосипеды", parentSlug: null, sortOrder: 0 },
  { slug: "road", name: "Шоссе", parentSlug: "bikes", sortOrder: 1 },
  { slug: "endurance", name: "Эндуранс", parentSlug: "road", sortOrder: 2 },
  { slug: "mtb", name: "MTB", parentSlug: "bikes", sortOrder: 3 },
];

function variant(overrides: Partial<ProductVariant> = {}): ProductVariant {
  return {
    id: "v1",
    productId: "p1",
    sku: "EM-M",
    barcode: null,
    frameSize: "M",
    wheelSize: "28",
    color: "чёрный",
    listPriceMinor: 349_900,
    currency: "BYN",
    status: "active",
    isActive: true,
    images: [],
    ...overrides,
  };
}

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    slug: "emonda",
    name: "Émonda",
    description: "шоссейный",
    status: "PUBLISHED",
    publishedAt: new Date("2026-01-01T00:00:00.000Z"),
    brandName: "Trek",
    brandSlug: "trek",
    categorySlug: "road",
    bicycleType: "ROAD",
    frameMaterial: "карбон",
    groupset: "Shimano 105",
    brakeType: "ободной",
    modelYear: 2026,
    warrantyMonths: 24,
    warrantyText: null,
    images: [],
    variants: [variant()],
    ...overrides,
  };
}

function query(overrides: Partial<CatalogListQuery> = {}): CatalogListQuery {
  return {
    now,
    page: 1,
    pageSize: 24,
    sort: { field: "publishedAt", direction: "desc" },
    filters: {},
    ...overrides,
  };
}

describe("category descendants", () => {
  it("includes the root and every nested child, and returns null for an unknown slug", () => {
    expect(descendantCategorySlugs(categories, "road")?.sort()).toEqual(
      ["endurance", "road"].sort(),
    );
    expect(descendantCategorySlugs(categories, "mtb")).toEqual(["mtb"]);
    expect(descendantCategorySlugs(categories, "unknown")).toBeNull();
  });
});

describe("storefront list matching", () => {
  it("excludes unpublished products and products with only inactive variants", () => {
    expect(productMatchesListQuery(product(), query(), null)).toBe(true);
    expect(productMatchesListQuery(product({ status: "DRAFT" }), query(), null)).toBe(
      false,
    );
    expect(
      productMatchesListQuery(
        product({ publishedAt: new Date("2026-09-13T12:00:01.000Z") }),
        query(),
        null,
      ),
    ).toBe(false);
    expect(
      productMatchesListQuery(
        product({
          variants: [variant({ status: "inactive", isActive: false })],
        }),
        query(),
        null,
      ),
    ).toBe(false);
  });

  it("treats available=false as every matching variant being out of stock", () => {
    const twoSizes = product({
      variants: [
        variant({ id: "v-m", frameSize: "M" }),
        variant({ id: "v-l", frameSize: "L", sku: "EM-L" }),
      ],
    });
    expect(
      productMatchesListQuery(
        twoSizes,
        query({
          filters: { available: false },
          availableVariantIds: ["v-m"],
        }),
        null,
      ),
    ).toBe(false);
    expect(
      productMatchesListQuery(
        twoSizes,
        query({
          filters: { available: false, frameSize: "L" },
          availableVariantIds: ["v-m"],
        }),
        null,
      ),
    ).toBe(true);
    expect(
      productMatchesListQuery(
        twoSizes,
        query({
          filters: { available: true },
          availableVariantIds: ["v-m"],
        }),
        null,
      ),
    ).toBe(true);
    expect(
      productMatchesListQuery(
        twoSizes,
        query({
          filters: { available: true },
          availableVariantIds: [],
        }),
        null,
      ),
    ).toBe(false);
  });

  it("applies inclusive price boundaries on the matching variant", () => {
    expect(
      productMatchesListQuery(
        product(),
        query({ filters: { minPriceMinor: 349_900, maxPriceMinor: 349_900 } }),
        null,
      ),
    ).toBe(true);
    expect(
      productMatchesListQuery(
        product(),
        query({ filters: { minPriceMinor: 349_901 } }),
        null,
      ),
    ).toBe(false);
    expect(
      productMatchesListQuery(
        product(),
        query({ filters: { maxPriceMinor: 349_899 } }),
        null,
      ),
    ).toBe(false);
  });

  it("keeps a child category when the filter is an ancestor", () => {
    const endurance = product({ categorySlug: "endurance" });
    const mtb = product({
      id: "p2",
      slug: "marlin",
      categorySlug: "mtb",
      bicycleType: "MTB",
    });
    const roadTree = descendantCategorySlugs(categories, "road");
    expect(productMatchesListQuery(endurance, query(), roadTree)).toBe(true);
    expect(productMatchesListQuery(mtb, query(), roadTree)).toBe(false);
    expect(
      productMatchesListQuery(
        endurance,
        query({ filters: { brandSlug: "specialized" } }),
        null,
      ),
    ).toBe(false);
    expect(
      productMatchesListQuery(
        endurance,
        query({ filters: { bicycleType: "MTB" } }),
        null,
      ),
    ).toBe(false);
  });
});

describe("list sort and pagination", () => {
  const aist = product({
    id: "p-a",
    slug: "aist",
    name: "Аист",
    publishedAt: new Date("2026-01-01T00:00:00.000Z"),
    variants: [variant({ id: "va", listPriceMinor: 200_000 })],
  });
  const velo = product({
    id: "p-v",
    slug: "velo",
    name: "Вело",
    publishedAt: new Date("2026-03-01T00:00:00.000Z"),
    variants: [variant({ id: "vv", listPriceMinor: 100_000 })],
  });
  const yakor = product({
    id: "p-y",
    slug: "yakor",
    name: "Якорь",
    publishedAt: new Date("2026-02-01T00:00:00.000Z"),
    variants: [variant({ id: "vy", listPriceMinor: 300_000 })],
  });

  it("sorts names with the Russian locale and prices by the cheapest active variant", () => {
    expect(
      sortListedProducts(
        [yakor, aist, velo],
        query({ sort: { field: "name", direction: "asc" } }),
      ).map((row) => row.name),
    ).toEqual(["Аист", "Вело", "Якорь"]);
    expect(
      sortListedProducts(
        [yakor, aist, velo],
        query({ sort: { field: "price", direction: "asc" } }),
      ).map((row) => row.id),
    ).toEqual(["p-v", "p-a", "p-y"]);
    expect(
      sortListedProducts(
        [aist, yakor, velo],
        query({ sort: { field: "publishedAt", direction: "desc" } }),
      ).map((row) => row.id),
    ).toEqual(["p-v", "p-y", "p-a"]);
  });

  it("pages a slice without changing the filtered total", () => {
    const items = [
      aist,
      velo,
      yakor,
      product({ id: "p4", slug: "p4", name: "Четыре" }),
      product({
        id: "p5",
        slug: "p5",
        name: "Пять",
      }),
    ];
    expect(paginateListed(items, query({ page: 2, pageSize: 2 }))).toEqual({
      items: [yakor, items[3]],
      total: 5,
    });
  });
});
