import { z } from "zod";
import { parseFilters, parseWithSchema, searchParamsObject } from "@/lib/http";
import { withRoute } from "@/app/api/_lib/route";
import { getDeliveryServices } from "@/app/api/_lib/compose";
import { toShipmentDto } from "./dto";

export const dynamic = "force-dynamic";

const assignSchema = z.object({
  orderId: z.string().min(1),
  methodCode: z.string().min(1),
  costMinor: z.number().int().nonnegative(),
});

const lookupSchema = z.object({
  orderId: z.string().min(1),
});

export const GET = withRoute("order_management", async (ctx) => {
  const query = parseWithSchema(
    lookupSchema,
    parseFilters(searchParamsObject(ctx.url), ["orderId"]),
  );
  const shipment = await getDeliveryServices().getShipment(ctx.principal, query.orderId);
  return { data: { shipment: toShipmentDto(shipment) } };
});

export const POST = withRoute("order_management", async (ctx) => {
  const body = parseWithSchema(assignSchema, await ctx.request.json());
  const shipment = await getDeliveryServices().assignShipment(ctx.principal, body);
  return { data: { shipment: toShipmentDto(shipment) }, status: 201 };
});
