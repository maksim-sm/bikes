import { expect, test } from "@playwright/test";
import { DEMO_ORDER_NUMBER, loginDemoCustomer, SELLABLE, t } from "./helpers";

test("demo customer sees order history and can save a wishlist", async ({ page }) => {
  await loginDemoCustomer(page);

  await page
    .getByRole("navigation", { name: t.account.nav })
    .getByRole("link", {
      name: t.account.orders,
    })
    .click();
  await expect(page.getByRole("heading", { name: t.account.orders })).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: t.account.orderNumber }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: DEMO_ORDER_NUMBER })).toBeVisible();

  await page.goto(`/products/${SELLABLE.slug}`);
  await expect(page.getByRole("heading", { name: SELLABLE.name })).toBeVisible();
  await page.getByRole("button", { name: t.product.wishlistAdd }).click();
  await expect(
    page.getByRole("button", { name: t.product.wishlistRemove }),
  ).toBeVisible();

  await page.goto("/account/wishlist");
  await expect(page.getByRole("heading", { name: t.account.wishlist })).toBeVisible();
  await expect(page.getByText(SELLABLE.name)).toBeVisible();
  await expect(page.getByText(SELLABLE.brand)).toBeVisible();
});
