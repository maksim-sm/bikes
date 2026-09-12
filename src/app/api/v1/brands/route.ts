import { withRoute } from "@/app/api/_lib/route";
import { getCatalogRepository } from "@/app/api/_lib/compose";
import { createCatalogServices } from "@/modules/catalog";

export const dynamic = "force-dynamic";

export const GET = withRoute("public", async () => {
  const services = createCatalogServices({
    catalog: await getCatalogRepository(),
    clock: { now: () => new Date() },
  });
  const brands = await services.listBrands();
  return {
    data: brands.map((brand) => ({
      slug: brand.slug,
      name: brand.name,
    })),
  };
});
