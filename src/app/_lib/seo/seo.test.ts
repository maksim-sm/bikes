import { describe, expect, it } from "vitest";
import robots from "@/app/robots";
import { t } from "@/lib/i18n";
import { serializeJsonLd } from "./json-ld";
import {
  breadcrumbJsonLd,
  catalogItemListJsonLd,
  imageAlt,
  organizationJsonLd,
  productJsonLd,
  websiteJsonLd,
} from "./schema";
import { absoluteUrl, productPath } from "./urls";

describe("robots.txt", () => {
  it("allows the storefront and keeps staff and account paths out of the index", () => {
    const file = robots();
    const rules = Array.isArray(file.rules) ? file.rules[0] : file.rules;
    expect(file.sitemap).toBe("http://localhost:3000/sitemap.xml");
    expect(rules?.disallow).toEqual(
      expect.arrayContaining(["/admin", "/account", "/checkout", "/cart", "/api/"]),
    );
  });
});

describe("public URLs", () => {
  it("builds absolute storefront URLs without double slashes", () => {
    expect(absoluteUrl("/")).toBe("http://localhost:3000/");
    expect(absoluteUrl("/catalog")).toBe("http://localhost:3000/catalog");
    expect(productPath("emonda")).toBe("/products/emonda");
  });
});

describe("structured data", () => {
  it("describes the shop as a Belarusian OnlineStore", () => {
    const store = organizationJsonLd();
    expect(store["@type"]).toBe("OnlineStore");
    expect(store.address).toMatchObject({
      addressCountry: "BY",
      addressLocality: t.delivery.pickupCity,
    });
    expect(websiteJsonLd()["@type"]).toBe("WebSite");
  });

  it("emits product offers in BYN major units and breadcrumbs with positions", () => {
    const product = productJsonLd({
      name: "Émonda SL 5",
      brandName: "Trek",
      description: "Шоссейный велосипед",
      slug: "emonda",
      sku: "EM-M-BLK",
      images: [{ src: "/api/media/demo/emonda", alt: "Trek Émonda" }],
      lowPriceMinor: 349_900,
      highPriceMinor: 359_900,
      offerCount: 2,
      currency: "BYN",
      inStock: true,
    });
    expect(product.offers).toMatchObject({
      priceCurrency: "BYN",
      lowPrice: "3499.00",
      highPrice: "3599.00",
      availability: "https://schema.org/InStock",
    });
    const crumbs = breadcrumbJsonLd([
      { name: t.seo.home, path: "/" },
      { name: t.catalog.title, path: "/catalog" },
    ]);
    expect(crumbs.itemListElement).toEqual([
      {
        "@type": "ListItem",
        position: 1,
        name: t.seo.home,
        item: "http://localhost:3000/",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: t.catalog.title,
        item: "http://localhost:3000/catalog",
      },
    ]);
    expect(
      catalogItemListJsonLd([{ slug: "emonda", name: "Émonda", brandName: "Trek" }]).url,
    ).toBe("http://localhost:3000/catalog");
    expect(
      catalogItemListJsonLd([{ slug: "emonda", name: "Émonda", brandName: "Trek" }], {
        name: "Велосипеды Trek",
        description: "Trek",
        path: "/catalog/brand/trek",
      }).url,
    ).toBe("http://localhost:3000/catalog/brand/trek");
  });

  it("falls back to a brand plus name when image alt is blank", () => {
    expect(imageAlt({ alt: "  ", brandName: "Trek", name: "Émonda" })).toBe(
      "Trek Émonda",
    );
    expect(imageAlt({ alt: "Вид спереди", brandName: "Trek", name: "Émonda" })).toBe(
      "Вид спереди",
    );
  });

  it("escapes script-breaking characters in JSON-LD", () => {
    const html = serializeJsonLd({
      description: "</script><script>alert(1)</script>",
    });
    expect(html).not.toContain("</script>");
    expect(html).toContain("\\u003c/script\\u003e");
  });
});
