import { withRoute } from "@/app/api/_lib/route";
import { getWishlistServices } from "@/app/api/_lib/compose";

export const dynamic = "force-dynamic";

export interface WishlistDto {
  productIds: string[];
}

export const GET = withRoute("customer", async (ctx) => {
  const userId = ctx.url.pathname.split("/")[4] ?? "";
  const wishlist = await getWishlistServices().getWishlist(ctx.principal, userId);
  const data: WishlistDto = { productIds: [...wishlist.productIds] };
  return { data };
});
