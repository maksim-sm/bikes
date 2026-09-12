import { z } from "zod";
import { parseWithSchema } from "@/lib/http";
import { withRoute } from "@/app/api/_lib/route";
import { getDeliveryServices } from "@/app/api/_lib/compose";
import { syncOrderFulfillment } from "@/app/admin/_lib/sync-fulfillment";
import { toShipmentDto } from "../dto";

export const dynamic = "force-dynamic";

const shipSchema = z.object({
  orderId: z.string().min(1),
  trackingNumber: z.string().min(1),
});

export const POST = withRoute("order_management", async (ctx) => {
  const body = parseWithSchema(shipSchema, await ctx.request.json());
  const shipment = await getDeliveryServices().markShipped(
    ctx.principal,
    body.orderId,
    body.trackingNumber,
  );
  await syncOrderFulfillment(ctx.principal, body.orderId, "shipped");
  return { data: { shipment: toShipmentDto(shipment) } };
});
