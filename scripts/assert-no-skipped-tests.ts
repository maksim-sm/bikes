/**
 * Fails CI when a critical suite is empty or a test is parked with skip/only.
 * A green build that never ran the expensive path is worse than a red one.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL("..", import.meta.url)));
const SKIP_PATTERN = /\b(?:it|test|describe)\.(?:skip|only)\s*\(/;
const ROOTS = ["src", "tests"];

function walk(dir: string, files: string[]): void {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === ".next" || name === "generated") {
      continue;
    }
    const path = join(dir, name);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      walk(path, files);
      continue;
    }
    if (/\.(test|spec)\.tsx?$/.test(name)) {
      files.push(path);
    }
  }
}

function main(): void {
  const files: string[] = [];
  for (const root of ROOTS) {
    walk(join(ROOT, root), files);
  }
  if (files.length === 0) {
    throw new Error("No unit, integration, or e2e spec files were found.");
  }

  const unit = files.filter(
    (path) => path.includes("/src/") && path.endsWith(".test.ts"),
  );
  const integration = files.filter((path) => path.includes("/tests/integration/"));
  const e2e = files.filter((path) => path.includes("/tests/e2e/"));
  if (unit.length === 0 || integration.length === 0 || e2e.length === 0) {
    throw new Error(
      `A critical suite is missing files (unit=${String(unit.length)}, ` +
        `integration=${String(integration.length)}, e2e=${String(e2e.length)}).`,
    );
  }

  const parked: string[] = [];
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    if (SKIP_PATTERN.test(text)) {
      parked.push(file.slice(ROOT.length + 1));
    }
  }
  if (parked.length > 0) {
    throw new Error(
      "Skipped or focused tests are not allowed. Remove .skip / .only from:\n" +
        parked.map((path) => `  - ${path}`).join("\n"),
    );
  }

  console.log(
    `Test inventory: ${String(unit.length)} unit, ${String(integration.length)} integration, ${String(e2e.length)} e2e.`,
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
