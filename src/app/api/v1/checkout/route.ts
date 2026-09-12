import { z } from "zod";
import { isAppError, ValidationError } from "@/lib/errors";
import { parseWithSchema } from "@/lib/http";
import { withRoute } from "@/app/api/_lib/route";
import { getCartServices, getOrderServices } from "@/app/api/_lib/compose";
import { actorFromRequest } from "@/app/(storefront)/_lib/cart-actor";
import { toOrderDto } from "../orders/dto";

export const dynamic = "force-dynamic";

const destinationSchema = z.object({
  recipientName: z.string(),
  phone: z.string(),
  region: z.string(),
  city: z.string(),
  street: z.string(),
  postalCode: z.string(),
});

/**
 * Money fields are accepted so a client cannot smuggle them past Zod and
 * still have them forwarded. They are stripped here and never reach
 * `PlaceOrderInput`.
 */
const checkoutSchema = z.object({
  customerEmail: z.string(),
  customerName: z.string(),
  customerPhone: z.string(),
  destination: destinationSchema,
  deliveryMethodCode: z.string().min(1),
  cartId: z.string().optional(),
  totalMinor: z.number().optional(),
  subtotalMinor: z.number().optional(),
  deliveryCostMinor: z.number().optional(),
  unitPriceMinor: z.number().optional(),
  items: z.unknown().optional(),
});

export const POST = withRoute("public", async (ctx) => {
  const body = parseWithSchema(checkoutSchema, await ctx.request.json());
  const actor = actorFromRequest(ctx.principal, ctx.request.headers.get("cookie"));
  if (!actor) {
    throw new ValidationError("cart is empty");
  }

  const carts = await getCartServices();
  let cart;
  try {
    cart = await carts.getCart(actor);
  } catch (error) {
    if (isAppError(error) && error.code === "not_found") {
      throw new ValidationError("cart is empty");
    }
    throw error;
  }

  const order = await (
    await getOrderServices()
  ).checkout({
    cartId: cart.id,
    actorUserId: actor.kind === "customer" ? actor.userId : null,
    guestToken: actor.kind === "guest" ? actor.guestToken : null,
    customerEmail: body.customerEmail,
    customerName: body.customerName,
    customerPhone: body.customerPhone,
    destination: body.destination,
    deliveryMethodCode: body.deliveryMethodCode,
  });

  return { data: toOrderDto(order), status: 201 };
});
