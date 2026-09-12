import { describe, expect, it } from "vitest";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { createMemoryCatalogRepository, type Product } from "@/modules/catalog";
import { toProductDetailDto, toProductListDto } from "./dto";
import { getProductHttp, listProductsHttp } from "./query";

const now = new Date("2026-09-12T12:00:00.000Z");

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
    variants: [
      {
        id: "v1",
        productId: "p1",
        sku: "EM-M",
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

function catalog(products: Product[]) {
  return createMemoryCatalogRepository({
    products,
    categories: [
      { slug: "bikes", name: "Велосипеды", parentSlug: null, sortOrder: 0 },
      { slug: "road", name: "Шоссе", parentSlug: "bikes", sortOrder: 1 },
      { slug: "mtb", name: "MTB", parentSlug: "bikes", sortOrder: 2 },
    ],
    brands: [{ slug: "trek", name: "Trek" }],
  });
}

describe("product HTTP mapping", () => {
  it("does not expose internal product fields on the list DTO", () => {
    const dto = toProductListDto(product());
    expect(dto).toMatchObject({
      slug: "emonda",
      name: "Émonda",
      brandName: "Trek",
      brandSlug: "trek",
      categorySlug: "road",
      bicycleType: "ROAD",
      priceFromMinor: 349900,
    });
    expect(dto).not.toHaveProperty("status");
    expect(dto).not.toHaveProperty("variants");
    expect(toProductDetailDto(product())).not.toHaveProperty("publishedAt");
  });
});

describe("product HTTP query", () => {
  it("filters, sorts, and paginates without returning the service object", async () => {
    const result = await listProductsHttp(
      catalog([
        product({ slug: "a", name: "Alpha", categorySlug: "road" }),
        product({ slug: "b", name: "Bravo", categorySlug: "mtb", bicycleType: "MTB" }),
        product({ slug: "c", name: "Charlie", categorySlug: "road" }),
      ]),
      now,
      new URL(
        "http://localhost/api/v1/products?category=road&sort=name&order=asc&page=1&pageSize=1",
      ),
    );
    expect(result.meta).toEqual({ page: 1, pageSize: 1, total: 2 });
    expect(result.data[0]?.slug).toBe("a");
  });

  it("applies brand, type, size, price, specs, and availability filters", async () => {
    const cheap = product({
      id: "p-cheap",
      slug: "fx",
      name: "FX",
      bicycleType: "CITY",
      frameMaterial: "алюминий",
      groupset: "Shimano Acera",
      variants: [
        {
          id: "v-cheap",
          productId: "p-cheap",
          sku: "FX-S",
          frameSize: "S",
          wheelSize: "28",
          color: "синий",
          listPriceMinor: 120000,
          currency: "BYN",
          isActive: true,
        },
      ],
    });
    const listed = await listProductsHttp(
      catalog([product(), cheap]),
      now,
      new URL(
        "http://localhost/api/v1/products?brand=trek&bicycleType=road&frameSize=M&wheelSize=28&minPrice=200000&maxPrice=400000&frameMaterial=%D0%BA%D0%B0%D1%80%D0%B1%D0%BE%D0%BD&groupset=Shimano%20105&available=true",
      ),
      {
        async listInStockVariantIds() {
          return ["v1"];
        },
        async listAvailabilityByVariantIds(variantIds) {
          return variantIds.map((variantId) => ({
            variantId,
            available: variantId === "v1" ? 1 : 0,
          }));
        },
      },
    );
    expect(listed.data.map((row) => row.slug)).toEqual(["emonda"]);
    const oos = await listProductsHttp(
      catalog([product()]),
      now,
      new URL("http://localhost/api/v1/products?available=true"),
      {
        async listInStockVariantIds() {
          return [];
        },
        async listAvailabilityByVariantIds(variantIds) {
          return variantIds.map((variantId) => ({ variantId, available: 0 }));
        },
      },
    );
    expect(oos.data).toEqual([]);
  });

  it("rejects unknown filters", async () => {
    await expect(
      listProductsHttp(
        catalog([]),
        now,
        new URL("http://localhost/api/v1/products?secret=1"),
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("searches brand, model, SKU, and specification text", async () => {
    const other = product({
      id: "p2",
      slug: "slash",
      name: "Slash",
      bicycleType: "MTB",
      categorySlug: "mtb",
      groupset: "SRAM GX",
      variants: [
        {
          id: "v2",
          productId: "p2",
          sku: "SL-L",
          frameSize: "L",
          wheelSize: "29",
          color: "зелёный",
          listPriceMinor: 499900,
          currency: "BYN",
          isActive: true,
        },
      ],
    });
    const repo = catalog([product(), other]);
    const byBrand = await listProductsHttp(
      repo,
      now,
      new URL("http://localhost/api/v1/products?q=Trek"),
    );
    expect(byBrand.data.map((row) => row.slug).sort()).toEqual(["emonda", "slash"]);
    const byModel = await listProductsHttp(
      repo,
      now,
      new URL("http://localhost/api/v1/products?q=%C3%89monda"),
    );
    expect(byModel.data.map((row) => row.slug)).toEqual(["emonda"]);
    const bySku = await listProductsHttp(
      repo,
      now,
      new URL("http://localhost/api/v1/products?q=SL-L"),
    );
    expect(bySku.data.map((row) => row.slug)).toEqual(["slash"]);
    const bySpec = await listProductsHttp(
      repo,
      now,
      new URL("http://localhost/api/v1/products?q=Shimano%20105"),
    );
    expect(bySpec.data.map((row) => row.slug)).toEqual(["emonda"]);
  });

  it("hides unpublished slugs", async () => {
    await expect(
      getProductHttp(catalog([product({ status: "DRAFT" })]), now, "emonda"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
