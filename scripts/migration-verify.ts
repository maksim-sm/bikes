/**
 * Applies committed migrations and fails if the live database does not
 * match `prisma/schema.prisma` or is missing a committed folder.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { Client } from "pg";
import { listCommittedMigrations } from "./committed-migrations";
import { redactedDatabase } from "./db-url";

const execFileAsync = promisify(execFile);
const ROOT = join(fileURLToPath(new URL("..", import.meta.url)));

async function prisma(
  args: string[],
  url: string,
): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync("pnpm", ["exec", "prisma", ...args], {
    cwd: ROOT,
    env: { ...process.env, DATABASE_URL: url },
  });
}

export async function verifyMigrations(url: string): Promise<void> {
  const committed = listCommittedMigrations(ROOT);
  if (committed.length === 0) {
    throw new Error("No committed migrations found under prisma/migrations.");
  }

  console.log(
    `Verifying ${String(committed.length)} migration(s) on ${redactedDatabase(url)}.`,
  );
  await prisma(["migrate", "deploy"], url);

  const status = await prisma(["migrate", "status"], url);
  const combined = `${status.stdout}\n${status.stderr}`;
  if (!combined.includes("Database schema is up to date")) {
    throw new Error(`prisma migrate status is not clean:\n${combined}`);
  }

  const sql = new Client({ connectionString: url });
  await sql.connect();
  try {
    const applied = await sql.query<{ migration_name: string }>(
      `SELECT migration_name FROM _prisma_migrations
       WHERE rolled_back_at IS NULL AND finished_at IS NOT NULL
       ORDER BY migration_name`,
    );
    const names = applied.rows.map((row) => row.migration_name);
    if (names.join("\n") !== committed.join("\n")) {
      throw new Error(
        [
          "Applied migrations do not match committed folders.",
          `applied (${String(names.length)}): ${names.join(", ")}`,
          `committed (${String(committed.length)}): ${committed.join(", ")}`,
        ].join("\n"),
      );
    }
  } finally {
    await sql.end();
  }

  console.log(
    `Database matches all ${String(committed.length)} committed migration folder(s).`,
  );
}
