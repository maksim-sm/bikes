import { withRoute } from "@/app/api/_lib/route";
import { getCartServices } from "@/app/api/_lib/compose";
import { actorFromRequest } from "@/app/(storefront)/_lib/cart-actor";
import { createPricingServices } from "@/modules/pricing";
import type { CartLineView, CartView } from "@/modules/cart";

export const dynamic = "force-dynamic";

function toLineDto(line: CartLineView) {
  return {
    variantId: line.variantId,
    productSlug: line.productSlug,
    productName: line.productName,
    brandName: line.brandName,
    frameSize: line.frameSize,
    color: line.color,
    wheelSize: line.wheelSize,
    quantity: line.quantity,
    unitPriceMinor: line.unitPriceMinor,
    lineTotalMinor: line.lineTotalMinor,
    available: line.available,
    purchasable: line.purchasable,
    issues: line.issues,
    alternatives: line.alternatives.map((option) => ({
      variantId: option.variantId,
      frameSize: option.frameSize,
      color: option.color,
      wheelSize: option.wheelSize,
      listPriceMinor: option.listPriceMinor,
      available: option.available,
      purchasable: option.purchasable,
    })),
  };
}

function toCartDto(view: CartView) {
  return {
    id: view.id,
    currency: view.currency,
    subtotalMinor: view.subtotalMinor,
    items: view.items.map(toLineDto),
  };
}

export const GET = withRoute("public", async (ctx) => {
  const actor = actorFromRequest(ctx.principal, ctx.request.headers.get("cookie"));
  if (!actor) {
    return {
      data: toCartDto({
        id: "",
        items: [],
        subtotalMinor: 0,
        currency: createPricingServices().currency(),
      }),
    };
  }
  const view = await (await getCartServices()).getCartView(actor);
  return { data: toCartDto(view) };
});
