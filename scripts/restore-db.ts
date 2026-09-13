/**
 * Restores a custom-format dump onto DATABASE_URL.
 * Drops and recreates that database first. Refuses remote hosts unless
 * CONFIRM_PRODUCTION_RESTORE=yes.
 */
import { execFile } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { promisify } from "node:util";
import { recreateDatabase } from "./db-admin";
import { isLoopbackHost, redactedDatabase, requireDatabaseUrl } from "./db-url";

const execFileAsync = promisify(execFile);

async function main(): Promise<void> {
  const dump = process.argv[2];
  if (!dump) {
    throw new Error("Usage: pnpm db:restore <path-to.dump>");
  }
  accessSync(dump, constants.R_OK);

  if (process.env["CONFIRM_RESTORE"] !== "yes") {
    throw new Error(
      "Refusing to restore. Set CONFIRM_RESTORE=yes after reading docs/database.md.",
    );
  }

  const url = requireDatabaseUrl();
  if (!isLoopbackHost(url) && process.env["CONFIRM_PRODUCTION_RESTORE"] !== "yes") {
    throw new Error(
      `Refusing to restore onto ${redactedDatabase(url)}. ` +
        "Set CONFIRM_PRODUCTION_RESTORE=yes for a non-loopback host.",
    );
  }

  console.log(`Recreating ${redactedDatabase(url)} before restore.`);
  await recreateDatabase(url);

  await execFileAsync("pg_restore", [
    "--dbname",
    url,
    "--no-owner",
    "--no-acl",
    "--exit-on-error",
    dump,
  ]);
  console.log(`Restored ${dump} onto ${redactedDatabase(url)}.`);
  console.log(
    "Run pnpm db:verify next, then pnpm db:migrate:deploy if the dump is older than HEAD.",
  );
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
