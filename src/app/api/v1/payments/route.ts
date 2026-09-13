import { z } from "zod";
import { parseWithSchema } from "@/lib/http";
import { enforceAbuse } from "@/app/api/_lib/abuse";
import { withRoute } from "@/app/api/_lib/route";
import { getPaymentServices } from "@/app/api/_lib/compose";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  orderId: z.string().min(1),
  returnUrl: z.url(),
});

/**
 * Starts a provider payment attempt. The storefront checkout path still
 * records the method only; this is the HTTP surface for initiation so the
 * abuse limiter can sit on a real request.
 */
export const POST = withRoute("public", async (ctx) => {
  await enforceAbuse("payment-start", ctx.request);
  const body = parseWithSchema(bodySchema, await ctx.request.json());
  const started = await getPaymentServices().startPayment(body.orderId, body.returnUrl);
  return { data: started, status: 201 };
});
