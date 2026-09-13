import { expect, test } from "@playwright/test";
import {
  addSellableToCart,
  fillGuestCheckout,
  openSellableProduct,
  searchCatalog,
  SELLABLE,
  t,
} from "./helpers";

test("phone layout hides catalog nav and still completes the path to checkout", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page.getByRole("navigation", { name: t.nav.main })).toBeHidden();
  await expect(page.getByRole("link", { name: t.nav.account })).toBeVisible();
  await expect(page.getByRole("link", { name: t.nav.cart })).toBeVisible();
  await expect(page.getByRole("link", { name: t.site.name })).toBeVisible();

  await page.goto("/catalog");
  await expect(page.getByRole("heading", { name: t.catalog.title })).toBeVisible();

  await searchCatalog(page, "велосипед");
  await expect(page.getByRole("heading", { name: SELLABLE.name })).toBeVisible();

  await openSellableProduct(page);
  await addSellableToCart(page);

  await page.getByRole("link", { name: t.nav.cart }).click();
  await expect(page.getByRole("heading", { name: t.cart.title })).toBeVisible();
  await expect(page.getByRole("link", { name: t.actions.checkout })).toBeVisible();

  await page.getByRole("link", { name: t.actions.checkout }).click();
  await expect(page.getByRole("heading", { name: t.checkout.title })).toBeVisible();
  await fillGuestCheckout(page);
  await expect(page.getByRole("button", { name: t.checkout.place })).toBeVisible();
});
