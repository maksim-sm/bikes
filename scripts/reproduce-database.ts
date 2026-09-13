/**
 * Creates an empty disposable database, applies every committed migration,
 * verifies it, then drops the database. Proof that the tree reproduces schema.
 */
import { databaseExists, dropDatabase, recreateDatabase } from "./db-admin";
import {
  assertDisposableDatabase,
  databaseNameFromUrl,
  redactedDatabase,
  requireDatabaseUrl,
  withDatabaseName,
} from "./db-url";
import { verifyMigrations } from "./migration-verify";

const DEFAULT_NAME = "bikes_reproduce";

async function main(): Promise<void> {
  const source = requireDatabaseUrl();
  const name = process.env["REPRODUCE_DATABASE"] ?? DEFAULT_NAME;
  assertDisposableDatabase(name);
  if (name === databaseNameFromUrl(source)) {
    throw new Error("REPRODUCE_DATABASE must not be the current DATABASE_URL database.");
  }

  const target = withDatabaseName(source, name);
  if ((await databaseExists(target)) && process.env["REPRODUCE_REPLACE"] !== "yes") {
    throw new Error(
      `Database ${name} already exists. Set REPRODUCE_REPLACE=yes to drop it first.`,
    );
  }
  await recreateDatabase(target);
  console.log(`Created empty ${redactedDatabase(target)}.`);

  try {
    await verifyMigrations(target);
  } catch (error) {
    if (process.env["REPRODUCE_KEEP"] !== "yes") {
      await dropDatabase(target);
      console.log(`Dropped ${name} after failure.`);
    }
    throw error;
  }
  if (process.env["REPRODUCE_KEEP"] === "yes") {
    console.log(`Keeping ${name}.`);
    return;
  }
  await dropDatabase(target);
  console.log(`Dropped ${name}.`);
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
