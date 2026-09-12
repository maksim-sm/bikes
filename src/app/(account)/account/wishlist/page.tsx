import type { Metadata } from "next";
import { getWishlistServices } from "@/app/api/_lib/compose";
import { MediaImage } from "@/app/(storefront)/_lib/media-image";
import { formatPrice, t } from "@/lib/i18n";
import type { WishlistIssue, WishlistViewItem } from "@/modules/identity";
import {
  Button,
  ButtonLink,
  Card,
  CardBody,
  CardFooter,
  CardTitle,
  Grid,
  Stack,
} from "@/ui";
import { requireAccountCustomer } from "../../_lib/guard";
import { accountHref } from "../../_lib/paths";
import styles from "../../account.module.css";
import { toggleWishlistAction } from "@/app/(storefront)/products/[slug]/wishlist-actions";

export const metadata: Metadata = {
  title: t.account.wishlist,
};

function issueLabel(issue: WishlistIssue): string {
  switch (issue) {
    case "missing":
      return t.account.wishlistMissing;
    case "unavailable":
      return t.account.wishlistUnavailable;
    case "out_of_stock":
      return t.account.wishlistOutOfStock;
    case "price_changed":
      return t.account.wishlistPriceChanged;
  }
}

function WishlistCard({ item }: { item: WishlistViewItem }) {
  const title = item.name ?? t.account.wishlistMissing;

  return (
    <Card filled>
      <CardBody>
        <Stack space={3}>
          {item.image ? <MediaImage src={item.image.src} alt={item.image.alt} /> : null}
          {item.brandName ? <p className={styles.hint}>{item.brandName}</p> : null}
          <CardTitle>{title}</CardTitle>
          {item.currentPriceMinor !== null ? (
            <p>
              {t.account.wishlistCurrentPrice}: {formatPrice(item.currentPriceMinor)}
            </p>
          ) : null}
          {item.issues.includes("price_changed") && item.savedPriceMinor !== null ? (
            <p className={styles.hint}>
              {t.account.wishlistSavedPrice}: {formatPrice(item.savedPriceMinor)}
            </p>
          ) : null}
          {item.issues.length > 0 ? (
            <ul className={styles.issueList}>
              {item.issues.map((issue) => (
                <li key={issue}>{issueLabel(issue)}</li>
              ))}
            </ul>
          ) : null}
        </Stack>
      </CardBody>
      <CardFooter>
        <div className={styles.actions}>
          {item.href ? (
            <ButtonLink href={accountHref(item.href)} variant="secondary">
              {t.account.wishlistOpen}
            </ButtonLink>
          ) : null}
          <form action={toggleWishlistAction}>
            <input type="hidden" name="productId" value={item.productId} />
            <input type="hidden" name="intent" value="remove" />
            <Button type="submit" variant="quiet">
              {t.account.wishlistRemove}
            </Button>
          </form>
        </div>
      </CardFooter>
    </Card>
  );
}

export default async function AccountWishlistPage() {
  const principal = await requireAccountCustomer();
  const view = await (
    await getWishlistServices()
  ).getWishlistView(principal, principal.userId);

  return (
    <Stack space={5}>
      <h1>{t.account.wishlist}</h1>
      <p className={styles.hint}>{t.account.wishlistLead}</p>
      {view.items.length === 0 ? (
        <Stack space={4}>
          <p>{t.account.wishlistEmpty}</p>
          <ButtonLink href="/catalog" variant="secondary">
            {t.account.wishlistEmptyCta}
          </ButtonLink>
        </Stack>
      ) : (
        <Grid minColumnWidth="16rem" space={5}>
          {view.items.map((item) => (
            <WishlistCard key={item.productId} item={item} />
          ))}
        </Grid>
      )}
    </Stack>
  );
}
