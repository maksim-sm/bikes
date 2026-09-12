"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getWishlistServices } from "@/app/api/_lib/compose";
import { currentPrincipal } from "@/app/_lib/session";
import { accountHref } from "@/app/(account)/_lib/paths";
import { isAppError } from "@/lib/errors";
import { requireCustomer } from "@/modules/identity";

export async function toggleWishlistAction(formData: FormData): Promise<void> {
  const productId = String(formData.get("productId") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const intent = String(formData.get("intent") ?? "");
  if (productId.length === 0) {
    return;
  }

  const session = await currentPrincipal();
  let principal;
  try {
    principal = requireCustomer(session);
  } catch (error) {
    if (isAppError(error) && error.code === "forbidden") {
      redirect(accountHref("/admin"));
    }
    redirect(accountHref("/login"));
  }

  const wishlist = await getWishlistServices();
  if (intent === "remove") {
    await wishlist.removeProduct(principal, principal.userId, productId);
  } else {
    try {
      await wishlist.addProduct(principal, principal.userId, productId);
    } catch (error) {
      if (!isAppError(error) || error.code !== "conflict") {
        throw error;
      }
    }
  }

  revalidatePath("/account/wishlist");
  if (slug.length > 0) {
    revalidatePath(`/products/${slug}`);
  }
}
