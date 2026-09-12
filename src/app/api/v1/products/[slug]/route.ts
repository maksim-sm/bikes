import { withRoute } from "@/app/api/_lib/route";
import { getCatalogRepository } from "@/app/api/_lib/compose";
import { getProductHttp } from "../query";

export const dynamic = "force-dynamic";

export const GET = withRoute("public", async (ctx) => {
  const slug = ctx.url.pathname.split("/").pop() ?? "";
  return {
    data: await getProductHttp(await getCatalogRepository(), new Date(), slug),
  };
});
