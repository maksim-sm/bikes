import type { MetadataRoute } from "next";
import { getCatalogServices } from "@/app/api/_lib/compose";
import { absoluteUrl, productPath } from "@/app/_lib/seo/urls";

export const dynamic = "force-dynamic";

const STATIC_PATHS = ["/", "/catalog", "/delivery", "/contacts", "/legal/terms", "/legal/privacy"];

async function publishedProductSlugs(): Promise<string[]> {
  const catalog = await getCatalogServices();
  const slugs: string[] = [];
  let page = 1;
  const pageSize = 50;
  for (;;) {
    const { items, total } = await catalog.listPublishedProducts({
      page,
      pageSize,
      sort: { field: "publishedAt", direction: "desc" },
      filters: {},
    });
    for (const product of items) {
      slugs.push(product.slug);
    }
    if (slugs.length >= total || items.length === 0) {
      break;
    }
    page += 1;
  }
  return slugs;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency: path === "/" || path === "/catalog" ? "daily" : "weekly",
    priority: path === "/" ? 1 : path === "/catalog" ? 0.8 : 0.5,
  }));
  const products = await publishedProductSlugs();
  return [
    ...staticEntries,
    ...products.map((slug) => ({
      url: absoluteUrl(productPath(slug)),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
