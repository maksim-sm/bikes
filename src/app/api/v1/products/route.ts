import { withRoute } from "@/app/api/_lib/route";
import { getCatalogInventory, getCatalogRepository } from "@/app/api/_lib/compose";
import { listProductsHttp } from "./query";

export const dynamic = "force-dynamic";

export const GET = withRoute("public", async (ctx) => {
  const result = await listProductsHttp(
    await getCatalogRepository(),
    new Date(),
    ctx.url,
    await getCatalogInventory(),
  );
  return { data: result.data, meta: result.meta };
});
