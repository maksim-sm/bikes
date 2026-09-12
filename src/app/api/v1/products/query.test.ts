import { describe, expect, it } from "vitest";
import { NotFoundError, ValidationError } from "@/lib/errors";
import type { CatalogRepository, Product } from "@/modules/catalog";
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
    categorySlug: "road",
    variants: [
      {
        id: "v1",
        productId: "p1",
        sku: "EM-M",
        frameSize: "M",
        color: "чёрный",
        listPriceMinor: 349900,
        currency: "BYN",
        isActive: true,
      },
    ],
    ...overrides,
  };
}

function repo(products: Product[]): CatalogRepository {
  return {
    async findBySlug(slug) {
      return products.find((item) => item.slug === slug) ?? null;
    },
    async listPublished() {
      return products.filter((item) => item.status === "PUBLISHED");
    },
  };
}

describe("product HTTP mapping", () => {
  it("does not expose internal product fields on the list DTO", () => {
    const dto = toProductListDto(product());
    expect(dto).toEqual({
      slug: "emonda",
      name: "Émonda",
      brandName: "Trek",
      categorySlug: "road",
    });
    expect(dto).not.toHaveProperty("status");
    expect(dto).not.toHaveProperty("variants");
    expect(toProductDetailDto(product())).not.toHaveProperty("publishedAt");
  });
});

describe("product HTTP query", () => {
  it("filters, sorts, and paginates without returning the service object", async () => {
    const catalog = repo([
      product({ slug: "a", name: "Alpha", categorySlug: "road" }),
      product({ slug: "b", name: "Bravo", categorySlug: "mtb" }),
      product({ slug: "c", name: "Charlie", categorySlug: "road" }),
    ]);
    const result = await listProductsHttp(
      catalog,
      now,
      new URL(
        "http://localhost/api/v1/products?category=road&sort=name&order=asc&page=1&pageSize=1",
      ),
    );
    expect(result.meta).toEqual({ page: 1, pageSize: 1, total: 2 });
    expect(result.data).toEqual([
      { slug: "a", name: "Alpha", brandName: "Trek", categorySlug: "road" },
    ]);
  });

  it("rejects unknown filters", async () => {
    await expect(
      listProductsHttp(
        repo([]),
        now,
        new URL("http://localhost/api/v1/products?secret=1"),
      ),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("hides unpublished slugs", async () => {
    await expect(
      getProductHttp(repo([product({ status: "DRAFT" })]), now, "emonda"),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
