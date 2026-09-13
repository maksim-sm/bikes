import { expect, type Page } from "@playwright/test";
import { ru as t } from "@/lib/i18n/messages/ru";

export { t };

export const DEMO_ORDER_NUMBER = "B-20260912-0001";
export const DEMO_ORDER_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd";

export const SELLABLE = {
  slug: "emonda",
  name: "Émonda SL 5",
  brand: "Trek",
  size: "M",
  color: "чёрный",
} as const;

export async function openCatalog(page: Page) {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: t.nav.main })
    .getByRole("link", {
      name: t.nav.catalog,
    })
    .click();
  await expect(page.getByRole("heading", { name: t.catalog.title })).toBeVisible();
}

export async function searchCatalog(page: Page, query: string) {
  await page.getByLabel(t.catalog.searchLabel).fill(query);
  await page.getByRole("button", { name: t.actions.search }).click();
}

export async function openSellableProduct(page: Page) {
  await page.getByRole("link", { name: t.catalog.openProduct }).click();
  await expect(page.getByRole("heading", { name: SELLABLE.name })).toBeVisible();
}

export async function selectSellableVariant(page: Page) {
  await page.locator(`input[name="frameSize"][value="${SELLABLE.size}"]`).check();
  await page.locator(`input[name="color"][value="${SELLABLE.color}"]`).check();
}

/** Demo wishlist is process-global; clear a leftover item before adding. */
export async function saveSellableToWishlist(page: Page) {
  const add = page.getByRole("button", { name: t.product.wishlistAdd });
  const remove = page.getByRole("button", { name: t.product.wishlistRemove });
  if (await remove.isVisible()) {
    await remove.click();
    await expect(add).toBeVisible();
  }
  await add.click();
  await expect(remove).toBeVisible();
}

export async function addSellableToCart(page: Page) {
  await selectSellableVariant(page);
  await page.getByRole("button", { name: t.actions.addToCart }).click();
  await expect(page.getByRole("status")).toContainText(t.product.addedToCart);
}

export async function loginDemoCustomer(page: Page) {
  await page.goto("/login");
  await page.getByRole("button", { name: t.account.demoSignIn }).click();
  await page.waitForURL("**/account");
  await expect(page.getByRole("heading", { name: t.account.title })).toBeVisible();
}

export async function loginDemoStaff(page: Page) {
  await page.goto("/admin/login");
  await page.getByRole("button", { name: t.admin.demoSignIn }).click();
  await page.waitForURL("**/admin/**");
  await expect(page.getByRole("navigation", { name: t.admin.nav })).toBeVisible();
}

export async function fillGuestCheckout(page: Page) {
  await page.getByLabel(t.fields.name, { exact: true }).fill("Иван Петров");
  await page.getByLabel(t.fields.email).fill("e2e-buyer@example.by");
  await page.getByLabel(t.fields.phone).fill("+375291234567");
  await page.getByLabel(t.fields.street).fill("ул. Ленина 1");
  await page.getByLabel(t.fields.postalCode).fill("220030");
  await page.getByRole("radio", { name: t.checkout.paymentCash }).check();
  await page.getByRole("checkbox", { name: t.checkout.consent }).check();
  await expect(page.getByRole("button", { name: t.checkout.place })).toBeEnabled();
}
