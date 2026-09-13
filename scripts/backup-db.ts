/**
 * Writes a custom-format `pg_dump` of DATABASE_URL.
 * Dumps contain customer PII. Keep them out of git and shared disks.
 */
import { execFile } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { redactedDatabase, requireDatabaseUrl } from "./db-url";

const execFileAsync = promisify(execFile);
const ROOT = join(fileURLToPath(new URL("..", import.meta.url)));

function stamp(): string {
  return new Date()
    .toISOString()
    .replaceAll(":", "")
    .replace(/\.\d+Z$/, "Z");
}

async function main(): Promise<void> {
  const url = requireDatabaseUrl();
  const dir = process.env["BACKUP_DIR"] ?? join(ROOT, "backups");
  mkdirSync(dir, { recursive: true });
  const dest = process.argv[2] ?? join(dir, `bikes-${stamp()}.dump`);

  await execFileAsync("pg_dump", [
    "--dbname",
    url,
    "--format=custom",
    "--no-owner",
    "--no-acl",
    "--file",
    dest,
  ]);
  console.log(`Wrote ${dest} from ${redactedDatabase(url)}.`);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
