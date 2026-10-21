import { expectNoA11yViolations } from "../helpers/a11y";
import { expect, test } from "../helpers/test";

/** Страницы, проверяемые axe. Новая страница добавляется сюда одной строкой. */
const PAGES = [{ name: "Главная", path: "/" }];

test.describe("Доступность (axe, WCAG 2.1 A и AA)", () => {
  for (const { name, path } of PAGES) {
    test(
      `${name}: нет нарушений`,
      { tag: "@smoke" },
      async ({ page }, testInfo) => {
        const response = await page.goto(path);

        expect(response?.status()).toBe(200);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expectNoA11yViolations(page, testInfo);
      },
    );
  }
});
