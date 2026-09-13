import { Client } from "pg";
import { env } from "@/lib/config";
import { isDraining } from "@/lib/lifecycle";

export type DatabasePing = () => Promise<void>;

let pingImpl: DatabasePing = pingDatabase;

export async function pingDatabase(url: string = env.DATABASE_URL): Promise<void> {
  const sql = new Client({ connectionString: url });
  await sql.connect();
  try {
    await sql.query("SELECT 1");
  } finally {
    await sql.end();
  }
}

export function setDatabasePing(fn: DatabasePing): void {
  pingImpl = fn;
}

export function resetDatabasePing(): void {
  pingImpl = pingDatabase;
}

export type Readiness =
  | { ready: true }
  | { ready: false; reason: "draining" | "database" };

export async function checkReadiness(): Promise<Readiness> {
  if (isDraining()) {
    return { ready: false, reason: "draining" };
  }
  try {
    await pingImpl();
    return { ready: true };
  } catch {
    return { ready: false, reason: "database" };
  }
}
