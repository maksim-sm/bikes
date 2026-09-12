import { z } from "zod";
import { ValidationError } from "@/lib/errors";
import { parseFilters, parseWithSchema, searchParamsObject } from "@/lib/http";
import { withRoute } from "@/app/api/_lib/route";
import { getAuditServices, getDeliveryServices } from "@/app/api/_lib/compose";
import { actorUserId } from "@/modules/identity";
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
  await getAuditServices().record(
    { actorUserId: actorUserId(ctx.principal), requestId: ctx.requestId },
    {
      action: "delivery.shipment.assign",
      entityType: "shipment",
      entityId: shipment.id,
      after: { orderId: body.orderId, methodCode: body.methodCode },
    },
  );
  return { data: { shipment: toShipmentDto(shipment) }, status: 201 };
});

const trackingSchema = z.object({
  orderId: z.string().min(1),
  carrierName: z.string().nullable(),
  trackingNumber: z.string().nullable(),
  trackingUrl: z.string().nullable(),
  shippedAt: z.string().nullable(),
  deliveredAt: z.string().nullable(),
  notes: z.string().nullable(),
});

function parseOptionalDate(value: string | null, field: string): Date | null {
  if (value === null || value.trim().length === 0) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`${field} is invalid`);
  }
  return date;
}

export const PATCH = withRoute("order_management", async (ctx) => {
  const body = parseWithSchema(trackingSchema, await ctx.request.json());
  const shipment = await getDeliveryServices().updateTracking(
    ctx.principal,
    body.orderId,
    {
      carrierName: body.carrierName,
      trackingNumber: body.trackingNumber,
      trackingUrl: body.trackingUrl,
      shippedAt: parseOptionalDate(body.shippedAt, "shippedAt"),
      deliveredAt: parseOptionalDate(body.deliveredAt, "deliveredAt"),
      notes: body.notes,
    },
  );
  return { data: { shipment: toShipmentDto(shipment) } };
});
