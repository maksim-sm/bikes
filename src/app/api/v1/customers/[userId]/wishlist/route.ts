import { z } from "zod";
import { parseWithSchema } from "@/lib/http";
import { withRoute } from "@/app/api/_lib/route";
import { getWishlistServices } from "@/app/api/_lib/compose";
import type { Principal, WishlistIssue, WishlistViewItem } from "@/modules/identity";

export const dynamic = "force-dynamic";

export interface WishlistItemDto {
  productId: string;
  slug: string | null;
  name: string | null;
  brandName: string | null;
  href: string | null;
  image: { src: string; alt: string } | null;
  savedPriceMinor: number | null;
  currentPriceMinor: number | null;
  listed: boolean;
  inStock: boolean;
  issues: WishlistIssue[];
}

export interface WishlistDto {
  productIds: string[];
  items: WishlistItemDto[];
}

function toItemDto(item: WishlistViewItem): WishlistItemDto {
  return {
    productId: item.productId,
    slug: item.slug,
    name: item.name,
    brandName: item.brandName,
    href: item.href,
    image: item.image,
    savedPriceMinor: item.savedPriceMinor,
    currentPriceMinor: item.currentPriceMinor,
    listed: item.listed,
    inStock: item.inStock,
    issues: [...item.issues],
  };
}

async function toDto(userId: string, principal: Principal): Promise<WishlistDto> {
  const view = await (await getWishlistServices()).getWishlistView(principal, userId);
  return {
    productIds: view.items.map((item) => item.productId),
    items: view.items.map(toItemDto),
  };
}

export const GET = withRoute("customer", async (ctx) => {
  const userId = ctx.url.pathname.split("/")[4] ?? "";
  return { data: await toDto(userId, ctx.principal) };
});

const productSchema = z.object({
  productId: z.string().min(1),
});

export const POST = withRoute("customer_only", async (ctx) => {
  const userId = ctx.url.pathname.split("/")[4] ?? "";
  const body = parseWithSchema(productSchema, await ctx.request.json());
  await (await getWishlistServices()).addProduct(ctx.principal, userId, body.productId);
  return { data: await toDto(userId, ctx.principal), status: 201 };
});

export const DELETE = withRoute("customer_only", async (ctx) => {
  const userId = ctx.url.pathname.split("/")[4] ?? "";
  const body = parseWithSchema(productSchema, await ctx.request.json());
  await (
    await getWishlistServices()
  ).removeProduct(ctx.principal, userId, body.productId);
  return { data: await toDto(userId, ctx.principal) };
});
