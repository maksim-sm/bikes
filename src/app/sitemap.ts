import type { MetadataRoute } from "next";
import { getCatalogServices } from "@/app/api/_lib/compose";
import { sitemapCatalogLandingPaths } from "@/app/_lib/seo/facets";
import { absoluteUrl, productPath } from "@/app/_lib/seo/urls";

export const dynamic = "force-dynamic";

const STATIC_PATHS = ["/", "/delivery", "/contacts", "/legal/terms", "/legal/privacy"];

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

async function catalogLandingEntries(now: Date): Promise<MetadataRoute.Sitemap> {
  const catalog = await getCatalogServices();
  const [categories, brands] = await Promise.all([
    catalog.listCategories(),
    catalog.listBrands(),
  ]);
  return sitemapCatalogLandingPaths({
    categorySlugs: categories.map((category) => category.slug),
    brandSlugs: brands.map((brand) => brand.slug),
  }).map((path) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency: "daily" as const,
    priority: path === "/catalog" ? 0.8 : 0.65,
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.5,
  }));
  const [landings, products] = await Promise.all([
    catalogLandingEntries(now),
    publishedProductSlugs(),
  ]);
  return [
    ...staticEntries,
    ...landings,
    ...products.map((slug) => ({
      url: absoluteUrl(productPath(slug)),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
