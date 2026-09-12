import { withRoute } from "@/app/api/_lib/route";
import { getCatalogRepository } from "@/app/api/_lib/compose";
import { listProductsHttp } from "./query";

export const dynamic = "force-dynamic";

export const GET = withRoute("public", async (ctx) => {
  const result = await listProductsHttp(getCatalogRepository(), new Date(), ctx.url);
  return { data: result.data, meta: result.meta };
});
