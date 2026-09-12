import { withRoute } from "@/app/api/_lib/route";
import { getDeliveryServices, getOrderServices } from "@/app/api/_lib/compose";
import { toCustomerShipmentDto } from "./dto";

export const dynamic = "force-dynamic";

export const GET = withRoute("customer", async (ctx) => {
  const id = ctx.url.pathname.split("/")[4] ?? "";
  const order = await (await getOrderServices()).getOrder(id, ctx.principal);
  const shipment = await getDeliveryServices().getShipmentForOrder(ctx.principal, order);
  return { data: { shipment: shipment ? toCustomerShipmentDto(shipment) : null } };
});
