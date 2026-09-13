import { expect, test } from "@playwright/test";
import {
  addSellableToCart,
  fillGuestCheckout,
  openCatalog,
  openSellableProduct,
  searchCatalog,
  SELLABLE,
  t,
} from "./helpers";

test("guest browses, searches, checks out with the cash payment fixture", async ({
  page,
}) => {
  await openCatalog(page);
  await expect(page.getByRole("heading", { name: SELLABLE.name })).toBeVisible();

  await searchCatalog(page, "велосипед");
  await expect(page).toHaveURL(/q=/);
  await expect(page.getByRole("heading", { name: SELLABLE.name })).toBeVisible();

  await openSellableProduct(page);
  await addSellableToCart(page);

  await page.getByRole("link", { name: t.product.goToCart }).click();
  await expect(page.getByRole("heading", { name: t.cart.title })).toBeVisible();
  await expect(page.getByText(SELLABLE.name)).toBeVisible();
  await expect(
    page.getByText(`${t.product.frameSize}: ${SELLABLE.size}`, { exact: false }),
  ).toBeVisible();

  await page.getByRole("link", { name: t.actions.checkout }).click();
  await expect(page.getByRole("heading", { name: t.checkout.title })).toBeVisible();
  await expect(page.getByRole("radio", { name: t.checkout.paymentCash })).toBeChecked();

  await fillGuestCheckout(page);
  await page.getByRole("button", { name: t.checkout.place }).click();

  await expect(page).toHaveURL(/\/checkout\/confirmation\//);
  await expect(
    page.getByRole("heading", { name: t.checkout.confirmationTitle }),
  ).toBeVisible();
  await expect(page.getByText(SELLABLE.name)).toBeVisible();
  await expect(page.getByText(t.checkout.paymentCash)).toBeVisible();
});
