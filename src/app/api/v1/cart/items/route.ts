import { z } from "zod";
import { NotFoundError } from "@/lib/errors";
import { parseWithSchema } from "@/lib/http";
import { withRoute } from "@/app/api/_lib/route";
import { getCartServices } from "@/app/api/_lib/compose";
import { usesSecureCookies } from "@/app/api/_lib/csrf";
import { actorFromRequest } from "@/app/(storefront)/_lib/cart-actor";
import { guestCartCookie } from "@/app/(storefront)/_lib/guest-cart";
import type { CartActor } from "@/modules/cart";
import type { HttpOnlyCookie } from "@/modules/identity";
import { toCartDto } from "../dto";

export const dynamic = "force-dynamic";

const addSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().min(1).max(10).default(1),
});

const updateSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().min(1).max(10).optional(),
  toVariantId: z.string().min(1).optional(),
});

const removeSchema = z.object({
  variantId: z.string().min(1),
});

function resolveOrCreateGuest(
  principalActor: CartActor | null,
  secure: boolean,
): { actor: CartActor; cookies: HttpOnlyCookie[] } {
  if (principalActor) {
    return { actor: principalActor, cookies: [] };
  }
  const guestToken = crypto.randomUUID();
  return {
    actor: { kind: "guest", guestToken },
    cookies: [guestCartCookie(guestToken, secure)],
  };
}

export const POST = withRoute("public", async (ctx) => {
  const body = parseWithSchema(addSchema, await ctx.request.json());
  const existing = actorFromRequest(ctx.principal, ctx.request.headers.get("cookie"));
  const { actor, cookies } = resolveOrCreateGuest(existing, usesSecureCookies());
  const cart = await getCartServices();
  await cart.addItem(actor, body.variantId, body.quantity);
  return { data: toCartDto(await cart.getCartView(actor)), cookies };
});

export const PATCH = withRoute("public", async (ctx) => {
  const body = parseWithSchema(updateSchema, await ctx.request.json());
  const actor = actorFromRequest(ctx.principal, ctx.request.headers.get("cookie"));
  if (!actor) {
    throw new NotFoundError("cart not found");
  }
  const cart = await getCartServices();
  if (body.toVariantId) {
    await cart.replaceItemVariant(actor, body.variantId, body.toVariantId);
  }
  if (body.quantity !== undefined && !body.toVariantId) {
    await cart.setItemQuantity(actor, body.variantId, body.quantity);
  }
  return { data: toCartDto(await cart.getCartView(actor)) };
});

export const DELETE = withRoute("public", async (ctx) => {
  const body = parseWithSchema(removeSchema, await ctx.request.json());
  const actor = actorFromRequest(ctx.principal, ctx.request.headers.get("cookie"));
  if (!actor) {
    throw new NotFoundError("cart not found");
  }
  const cart = await getCartServices();
  await cart.removeItem(actor, body.variantId);
  return { data: toCartDto(await cart.getCartView(actor)) };
});
