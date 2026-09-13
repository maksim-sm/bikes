import { requireDatabaseUrl } from "./db-url";
import { verifyMigrations } from "./migration-verify";

async function main(): Promise<void> {
  try {
    await verifyMigrations(requireDatabaseUrl());
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

void main();
