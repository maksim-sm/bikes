import AxeBuilder from "@axe-core/playwright";
import type { Page, TestInfo } from "@playwright/test";
import type { Result } from "axe-core";

import { expect } from "./test";

/** Стандарты, по которым проверяется каждая страница: WCAG 2.1 A и AA. */
export const WCAG_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"];

const MAX_NODES_IN_REPORT = 5;

type A11yOptions = {
  /** CSS-селекторы, которые не проверяются (только с обоснованием в коде вызова). */
  exclude?: string[];
  /** Если задан — проверяется только эта область страницы. */
  include?: string;
};

/** Превращает нарушения axe в читаемый отчёт: правило, элементы, ссылка на описание. */
export function formatViolations(violations: Result[]): string {
  return violations
    .map((violation) => {
      const nodes = violation.nodes
        .slice(0, MAX_NODES_IN_REPORT)
        .map((node) => `    - ${node.target.join(" ")}\n      ${node.html}`)
        .join("\n");
      const hidden = violation.nodes.length - MAX_NODES_IN_REPORT;
      const more = hidden > 0 ? `\n    … и ещё ${hidden}` : "";

      return [
        `[${violation.impact ?? "unknown"}] ${violation.id}: ${violation.help}`,
        `  Подробнее: ${violation.helpUrl}`,
        `  Элементы (${violation.nodes.length}):`,
        `${nodes}${more}`,
      ].join("\n");
    })
    .join("\n\n");
}

/**
 * Проверяет доступность открытой страницы через axe-core (WCAG 2.1 A и AA).
 * Падает при любом нарушении; полный JSON-отчёт прикладывается к результату теста.
 */
export async function expectNoA11yViolations(
  page: Page,
  testInfo: TestInfo,
  { exclude = [], include }: A11yOptions = {},
): Promise<void> {
  let builder = new AxeBuilder({ page }).withTags(WCAG_TAGS);

  if (include) {
    builder = builder.include(include);
  }
  for (const selector of exclude) {
    builder = builder.exclude(selector);
  }

  const { violations } = await builder.analyze();

  await testInfo.attach("axe-violations.json", {
    body: JSON.stringify(violations, null, 2),
    contentType: "application/json",
  });

  expect(
    violations,
    `Нарушения доступности (${violations.length}):\n\n${formatViolations(violations)}\n`,
  ).toEqual([]);
}
