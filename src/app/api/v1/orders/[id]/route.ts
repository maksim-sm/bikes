import { withRoute } from "@/app/api/_lib/route";
import { getOrderServices } from "@/app/api/_lib/compose";
import { toOrderDto } from "../dto";

export const dynamic = "force-dynamic";

export const GET = withRoute("customer", async (ctx) => {
  const id = ctx.url.pathname.split("/").pop() ?? "";
  const loaded = await (await getOrderServices()).getOrder(id, ctx.principal);
  return { data: toOrderDto(loaded) };
});
