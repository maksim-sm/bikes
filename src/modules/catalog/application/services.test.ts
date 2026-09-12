import { describe, expect, it } from "vitest";
import { NotFoundError } from "@/lib/errors";
import { findActiveVariant, isListedOnStorefront, type Product } from "../domain/product";
import type { CatalogRepository } from "./ports";
import { createCatalogServices } from "./services";

const now = new Date("2026-09-12T12:00:00.000Z");

function product(overrides: Partial<Product> = {}): Product {
  return {
    id: "p1",
    slug: "emonda",
    name: "Émonda",
    description: "шоссейный",
    status: "PUBLISHED",
    publishedAt: new Date("2026-09-01T00:00:00.000Z"),
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
    variants: [
      {
        id: "v1",
        productId: "p1",
        sku: "EM-M-BLK",
        frameSize: "M",
        wheelSize: "28",
        color: "чёрный",
        listPriceMinor: 349900,
        currency: "BYN",
        isActive: true,
      },
    ],
    ...overrides,
  };
}

function memoryCatalog(products: Product[]): CatalogRepository {
  return {
    async findBySlug(slug) {
      return products.find((item) => item.slug === slug) ?? null;
    },
    async listPublished(query) {
      const items = products.filter((item) => isListedOnStorefront(item, query.now));
      return { items, total: items.length };
    },
    async listCategories() {
      return [];
    },
    async listBrands() {
      return [];
    },
  };
}

describe("catalog visibility", () => {
  it("hides drafts, archives, and future publish dates", () => {
    expect(isListedOnStorefront(product({ status: "DRAFT" }), now)).toBe(false);
    expect(isListedOnStorefront(product({ status: "ARCHIVED" }), now)).toBe(false);
    expect(
      isListedOnStorefront(
        product({ publishedAt: new Date("2026-09-13T00:00:00.000Z") }),
        now,
      ),
    ).toBe(false);
    expect(isListedOnStorefront(product(), now)).toBe(true);
  });

  it("finds only active variants", () => {
    const listed = product({
      variants: [
        { ...product().variants[0]!, id: "inactive", isActive: false },
        product().variants[0]!,
      ],
    });
    expect(findActiveVariant(listed, "v1")?.sku).toBe("EM-M-BLK");
    expect(findActiveVariant(listed, "inactive")).toBeNull();
  });
});

describe("catalog services", () => {
  it("lists only storefront-visible products", async () => {
    const catalog = createCatalogServices({
      catalog: memoryCatalog([product(), product({ slug: "draft", status: "DRAFT" })]),
      clock: { now: () => now },
    });
    const listed = await catalog.listPublishedProducts({
      page: 1,
      pageSize: 20,
      sort: { field: "publishedAt", direction: "desc" },
      filters: {},
    });
    expect(listed.items.map((item) => item.slug)).toEqual(["emonda"]);
  });

  it("does not leak unpublished products by slug", async () => {
    const catalog = createCatalogServices({
      catalog: memoryCatalog([product({ status: "DRAFT" })]),
      clock: { now: () => now },
    });
    await expect(catalog.getProductBySlug("emonda")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
