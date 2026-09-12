import { describe, expect, it } from "vitest";
import {
  assertRequiredProduct,
  isListedOnStorefront,
  publishProduct,
  unpublishProduct,
  type Product,
  type ProductWriteInput,
} from "./product";

const now = new Date("2026-09-12T12:00:00.000Z");

function input(overrides: Partial<ProductWriteInput> = {}): ProductWriteInput {
  return {
    slug: "emonda-sl-5",
    name: "Émonda SL 5",
    description: "шоссейный",
    brandSlug: "trek",
    categorySlug: "road",
    bicycleType: "ROAD",
    frameMaterial: "карбон",
    groupset: "Shimano 105",
    brakeType: "дисковые",
    modelYear: 2026,
    warrantyMonths: 24,
    warrantyText: null,
    variants: [
      {
        sku: "EM-M",
        frameSize: "M",
        wheelSize: "28",
        color: "чёрный",
        listPriceMinor: 349900,
        isActive: true,
      },
    ],
    ...overrides,
  };
}

function product(): Product {
  const fields = input();
  return {
    id: "p1",
    slug: fields.slug,
    name: fields.name,
    description: fields.description,
    status: "DRAFT",
    publishedAt: null,
    brandName: "Trek",
    brandSlug: fields.brandSlug,
    categorySlug: fields.categorySlug,
    bicycleType: fields.bicycleType,
    frameMaterial: fields.frameMaterial,
    groupset: fields.groupset,
    brakeType: fields.brakeType,
    modelYear: fields.modelYear,
    warrantyMonths: fields.warrantyMonths,
    warrantyText: fields.warrantyText,
    images: [],
    variants: [
      {
        id: "v1",
        productId: "p1",
        sku: "EM-M",
        barcode: null,
        frameSize: "M",
        wheelSize: "28",
        color: "чёрный",
        listPriceMinor: 349900,
        currency: "BYN",
        status: "active",
        isActive: true,
        images: [],
      },
    ],
  };
}

describe("product write validation", () => {
  it("requires identity, type, and a priced variant", () => {
    expect(() => assertRequiredProduct(input({ name: "  " }))).toThrow(
      "product_name_required",
    );
    expect(() => assertRequiredProduct(input({ slug: "Émonda" }))).toThrow(
      "product_slug_invalid",
    );
    expect(() => assertRequiredProduct(input({ variants: [] }))).toThrow(
      "product_variant_required",
    );
    expect(() =>
      assertRequiredProduct(
        input({
          variants: [
            {
              sku: "X",
              frameSize: "M",
              wheelSize: "28",
              color: "чёрный",
              listPriceMinor: 0,
            },
          ],
        }),
      ),
    ).toThrow("product_price_invalid");
    expect(() => assertRequiredProduct(input())).not.toThrow();
  });

  it("rejects duplicate SKUs and size/color/wheel combinations", () => {
    expect(() =>
      assertRequiredProduct(
        input({
          variants: [
            {
              sku: "EM-M",
              frameSize: "M",
              wheelSize: "28",
              color: "чёрный",
              listPriceMinor: 349900,
            },
            {
              sku: "em-m",
              frameSize: "L",
              wheelSize: "28",
              color: "красный",
              listPriceMinor: 349900,
            },
          ],
        }),
      ),
    ).toThrow("variant_sku_duplicate");
    expect(() =>
      assertRequiredProduct(
        input({
          variants: [
            {
              sku: "EM-M",
              frameSize: "M",
              wheelSize: "28",
              color: "чёрный",
              listPriceMinor: 349900,
            },
            {
              sku: "EM-M-2",
              frameSize: "m",
              wheelSize: "28",
              color: "Чёрный",
              listPriceMinor: 359900,
            },
          ],
        }),
      ),
    ).toThrow("variant_combination_duplicate");
    expect(() =>
      assertRequiredProduct(
        input({
          variants: [
            {
              sku: "EM-M",
              barcode: "4810001",
              frameSize: "M",
              wheelSize: "28",
              color: "чёрный",
              listPriceMinor: 349900,
            },
            {
              sku: "EM-L",
              barcode: "4810001",
              frameSize: "L",
              wheelSize: "28",
              color: "чёрный",
              listPriceMinor: 349900,
            },
          ],
        }),
      ),
    ).toThrow("variant_barcode_duplicate");
  });
});

describe("publish and unpublish", () => {
  it("publishes a complete draft and hides it again on unpublish", () => {
    const published = publishProduct(product(), now);
    expect(published.status).toBe("PUBLISHED");
    expect(published.publishedAt).toEqual(now);
    expect(isListedOnStorefront(published, now)).toBe(true);

    const draft = unpublishProduct(published);
    expect(draft.status).toBe("DRAFT");
    expect(isListedOnStorefront(draft, now)).toBe(false);
  });

  it("does not publish a product without an active variant", () => {
    const incomplete = product();
    incomplete.variants[0] = {
      ...incomplete.variants[0]!,
      status: "inactive",
      isActive: false,
    };
    expect(() => publishProduct(incomplete, now)).toThrow("product_variant_required");
  });
});
