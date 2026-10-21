import { expect, test } from "../helpers/test";

test.describe("Главная страница", () => {
  test(
    "открывается, H1 виден, ошибок консоли нет",
    { tag: "@smoke" },
    async ({ page }) => {
      const response = await page.goto("/");

      expect(response?.status()).toBe(200);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    },
  );
});
