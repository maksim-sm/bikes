import { withRoute } from "@/app/api/_lib/route";
import { getOrderServices } from "@/app/api/_lib/compose";
import { toOrderDto } from "./dto";

export const dynamic = "force-dynamic";

export const GET = withRoute("customer_only", async (ctx) => {
  const orders = await (await getOrderServices()).listOrders(ctx.principal);
  return { data: { orders: orders.map(toOrderDto) } };
});
