import { describe, expect, it } from "vitest";
import { parseProductForm } from "./product-form";

function form(entries: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    data.set(key, value);
  }
  return data;
}

describe("parseProductForm", () => {
  it("maps variant status, barcode, and media", () => {
    const parsed = parseProductForm(
      form({
        name: "FX 3 Disc",
        slug: "fx-3-disc",
        description: "городский",
        brandSlug: "trek",
        categorySlug: "city",
        bicycleType: "CITY",
        variantCount: "1",
        "variant-0-sku": "FX-M-BLU",
        "variant-0-barcode": "4810001",
        "variant-0-frameSize": "M",
        "variant-0-wheelSize": "28",
        "variant-0-color": "синий",
        "variant-0-price": "2199.00",
        "variant-0-status": "inactive",
        "variant-0-mediaKey": "demo/fx-m-blue",
        "variant-0-mediaAlt": "FX 3 Disc, синий",
      }),
    );
    expect(parsed).toMatchObject({
      variants: [
        {
          sku: "FX-M-BLU",
          barcode: "4810001",
          frameSize: "M",
          wheelSize: "28",
          color: "синий",
          listPriceMinor: 219900,
          status: "inactive",
          isActive: false,
          images: [
            {
              key: "demo/fx-m-blue",
              alt: "FX 3 Disc, синий",
              role: "PRIMARY",
              sortOrder: 0,
            },
          ],
        },
      ],
    });
  });

  it("rejects an unknown variant status", () => {
    const parsed = parseProductForm(
      form({
        name: "FX",
        slug: "fx",
        description: "x",
        brandSlug: "trek",
        categorySlug: "city",
        bicycleType: "CITY",
        variantCount: "1",
        "variant-0-sku": "FX-M",
        "variant-0-frameSize": "M",
        "variant-0-wheelSize": "28",
        "variant-0-color": "синий",
        "variant-0-price": "100.00",
        "variant-0-status": "archived",
      }),
    );
    expect(parsed).toEqual({ error: "variant_status_invalid" });
  });
});
