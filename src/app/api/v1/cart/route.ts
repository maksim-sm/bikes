import { withRoute } from "@/app/api/_lib/route";
import { getCartServices } from "@/app/api/_lib/compose";
import { actorFromRequest } from "@/app/(storefront)/_lib/cart-actor";
import { emptyCartDto, toCartDto } from "./dto";

export const dynamic = "force-dynamic";

export const GET = withRoute("public", async (ctx) => {
  const actor = actorFromRequest(ctx.principal, ctx.request.headers.get("cookie"));
  if (!actor) {
    return { data: emptyCartDto() };
  }
  const view = await (await getCartServices()).getCartView(actor);
  return { data: toCartDto(view) };
});
