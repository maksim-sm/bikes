import { expect, test } from "@playwright/test";
import { DEMO_ORDER_ID, DEMO_ORDER_NUMBER, loginDemoStaff, t } from "./helpers";

test("staff opens the seeded order, saves notes, and sees the payment fixture", async ({
  page,
}) => {
  await loginDemoStaff(page);

  await page
    .getByRole("navigation", { name: t.admin.nav })
    .getByRole("link", {
      name: t.admin.orders,
    })
    .click();
  await expect(page.getByRole("heading", { name: t.admin.orders })).toBeVisible();

  await page.getByLabel(t.admin.searchOrders).fill(DEMO_ORDER_NUMBER);
  await page.getByRole("button", { name: t.admin.applyFilters }).click();
  await expect(page.getByRole("link", { name: DEMO_ORDER_NUMBER })).toBeVisible();

  await page.getByRole("link", { name: DEMO_ORDER_NUMBER }).click();
  await expect(page).toHaveURL(new RegExp(`/admin/orders/${DEMO_ORDER_ID}`));
  await expect(
    page.getByRole("heading", { name: `${t.account.order} ${DEMO_ORDER_NUMBER}` }),
  ).toBeVisible();
  await expect(
    page.getByRole("cell", { name: t.account.paymentSucceeded }).first(),
  ).toBeVisible();
  await expect(page.getByText(t.checkout.paymentCash).first()).toBeVisible();

  const notes = page.getByRole("textbox", { name: t.admin.staffNotes });
  await notes.fill("E2E: заказ проверен, можно собирать.");
  await page.getByRole("button", { name: t.admin.saveNotes }).click();
  await expect(page.getByRole("status")).toContainText(t.admin.staffNotesSaved);

  await expect(page.getByRole("heading", { name: t.admin.refundTitle })).toBeVisible();
  await expect(page.getByRole("button", { name: t.admin.refundSubmit })).toBeVisible();
});
