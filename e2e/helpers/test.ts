import { expect, test as base } from "@playwright/test";

/**
 * Общий test для всех e2e: каждая страница автоматически отслеживается.
 * Ошибки консоли, необработанные исключения страницы и ответы 4xx/5xx
 * заваливают тест после его завершения.
 */
export const test = base.extend({
  page: async ({ page }, provide) => {
    const problems: string[] = [];

    page.on("console", (message) => {
      if (message.type() === "error") {
        problems.push(`console.error: ${message.text()}`);
      }
    });
    page.on("pageerror", (error) => {
      problems.push(`pageerror: ${error.message}`);
    });
    page.on("response", (response) => {
      if (response.status() >= 400) {
        const { method } = response.request();
        problems.push(
          `HTTP ${response.status()} ${method()} ${response.url()}`,
        );
      }
    });

    await provide(page);

    expect(
      problems,
      "На странице есть ошибки консоли или ответы 4xx/5xx",
    ).toEqual([]);
  },
});

export { expect };
