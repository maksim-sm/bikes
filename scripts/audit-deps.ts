/**
 * Production dependency audit. High/critical findings fail CI unless they
 * are listed in docs/dependency-advisories.json with a reason.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL("..", import.meta.url)));
const ALLOWLIST_PATH = join(ROOT, "docs/dependency-advisories.json");
const FAIL_SEVERITIES = new Set(["high", "critical"]);

interface Advisory {
  id: number;
  module_name: string;
  severity: string;
  github_advisory_id?: string;
  title?: string;
}

interface Allowlist {
  ignore: Array<{
    ghsa: string;
    reason: string;
  }>;
}

function runAudit(): { advisories: Record<string, Advisory> } {
  try {
    const raw = execFileSync("pnpm", ["audit", "--json", "--prod"], {
      encoding: "utf8",
      cwd: ROOT,
    });
    return JSON.parse(raw) as { advisories: Record<string, Advisory> };
  } catch (error) {
    const stdout =
      error && typeof error === "object" && "stdout" in error
        ? String((error as { stdout: string }).stdout)
        : "";
    if (stdout.trim().startsWith("{")) {
      return JSON.parse(stdout) as { advisories: Record<string, Advisory> };
    }
    throw error;
  }
}

function main(): void {
  const allowlist = JSON.parse(readFileSync(ALLOWLIST_PATH, "utf8")) as Allowlist;
  const allowed = new Set(allowlist.ignore.map((item) => item.ghsa));
  const { advisories } = runAudit();
  const findings = Object.values(advisories);
  const blocking: Advisory[] = [];

  for (const advisory of findings) {
    const ghsa = advisory.github_advisory_id ?? "";
    const severity = advisory.severity.toLowerCase();
    if (!FAIL_SEVERITIES.has(severity)) {
      continue;
    }
    if (ghsa && allowed.has(ghsa)) {
      console.log(`Allowed ${ghsa} (${advisory.module_name}): documented exception.`);
      continue;
    }
    blocking.push(advisory);
  }

  if (blocking.length > 0) {
    const lines = blocking.map(
      (item) =>
        `  - ${item.github_advisory_id ?? String(item.id)} ${item.severity} ${item.module_name}: ${item.title ?? ""}`,
    );
    throw new Error(
      `Unreviewed high/critical production advisories:\n${lines.join("\n")}\n` +
        `Document a time-bounded exception in docs/dependency-advisories.json only if the path is not reachable.`,
    );
  }

  console.log(
    `Dependency audit: ${String(findings.length)} production advisory(ies), none unreviewed at high/critical.`,
  );
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
