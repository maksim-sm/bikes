import { Client } from "pg";
import { adminDatabaseUrl, databaseNameFromUrl } from "./db-url";

async function withAdmin<T>(
  url: string,
  fn: (admin: Client, name: string) => Promise<T>,
): Promise<T> {
  const name = databaseNameFromUrl(url);
  const admin = new Client({ connectionString: adminDatabaseUrl(url) });
  await admin.connect();
  try {
    return await fn(admin, name);
  } finally {
    await admin.end();
  }
}

export async function databaseExists(url: string): Promise<boolean> {
  return withAdmin(url, async (admin, name) => {
    const exists = await admin.query("SELECT 1 FROM pg_database WHERE datname = $1", [
      name,
    ]);
    return (exists.rowCount ?? 0) > 0;
  });
}

export async function dropDatabase(url: string): Promise<void> {
  const name = databaseNameFromUrl(url);
  if (name === "postgres" || name.startsWith("template")) {
    throw new Error(`Refusing to drop ${JSON.stringify(name)}.`);
  }
  await withAdmin(url, async (admin) => {
    await admin.query(
      `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
       WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [name],
    );
    await admin.query(`DROP DATABASE IF EXISTS ${name}`);
  });
}

export async function recreateDatabase(url: string): Promise<void> {
  await dropDatabase(url);
  await withAdmin(url, async (admin, name) => {
    await admin.query(`CREATE DATABASE ${name}`);
  });
}
