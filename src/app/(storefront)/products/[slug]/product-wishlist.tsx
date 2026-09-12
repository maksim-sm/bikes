import { getWishlistServices } from "@/app/api/_lib/compose";
import { currentPrincipal } from "@/app/_lib/session";
import { t } from "@/lib/i18n";
import { Button, TextLink } from "@/ui";
import { toggleWishlistAction } from "./wishlist-actions";
import styles from "./product-detail.module.css";

export async function ProductWishlist({
  productId,
  slug,
}: {
  productId: string;
  slug: string;
}) {
  const principal = await currentPrincipal();
  if (principal.type !== "customer") {
    return (
      <p className={styles.wishlistHint}>
        <TextLink href="/login">{t.product.wishlistSignIn}</TextLink>
      </p>
    );
  }

  const view = await (
    await getWishlistServices()
  ).getWishlistView(principal, principal.userId);
  const onList = view.items.some((item) => item.productId === productId);

  return (
    <form action={toggleWishlistAction}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="intent" value={onList ? "remove" : "add"} />
      <Button type="submit" variant="secondary" fullWidth>
        {onList ? t.product.wishlistRemove : t.product.wishlistAdd}
      </Button>
    </form>
  );
}
