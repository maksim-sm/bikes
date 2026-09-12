import { withRoute } from "@/app/api/_lib/route";
import { getDeliveryServices } from "@/app/api/_lib/compose";
import { toDeliveryMethodDto } from "../../deliveries/dto";

export const dynamic = "force-dynamic";

export const GET = withRoute("order_management", async (ctx) => {
  const methods = await getDeliveryServices().listMethods(ctx.principal);
  return { data: { methods: methods.map(toDeliveryMethodDto) } };
});
