import { describe, expect, it } from "vitest";
import type { Product } from "./product";
import { escapeIlike, productMatchesSearch, searchDocument } from "./search";

const product: Product = {
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
      barcode: "4810123450001",
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

describe("catalog search document", () => {
  it("covers brand, model, SKU, and spec text", () => {
    const document = searchDocument(product);
    expect(document).toContain("Trek");
    expect(document).toContain("Émonda");
    expect(document).toContain("EM-M");
    expect(document).toContain("4810123450001");
    expect(document).toContain("Shimano 105");
    expect(document).toContain("карбон");
    expect(productMatchesSearch(product, "trek")).toBe(true);
    expect(productMatchesSearch(product, "Émonda")).toBe(true);
    expect(productMatchesSearch(product, "EM-M")).toBe(true);
    expect(productMatchesSearch(product, "shimano 105")).toBe(true);
    expect(productMatchesSearch(product, "fx")).toBe(false);
    expect(escapeIlike("50%_off")).toBe("50\\%\\_off");
  });

  it("treats a blank query as a match and requires every token", () => {
    expect(productMatchesSearch(product, "")).toBe(true);
    expect(productMatchesSearch(product, "   ")).toBe(true);
    expect(productMatchesSearch(product, "trek emonda")).toBe(true);
    expect(productMatchesSearch(product, "trek fx")).toBe(false);
    expect(productMatchesSearch(product, "чёрный")).toBe(true);
    expect(escapeIlike("a\\b")).toBe("a\\\\b");
  });
});
