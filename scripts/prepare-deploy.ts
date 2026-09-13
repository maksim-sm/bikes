/**
 * Host-side gate before `next start`: validate injected env, apply
 * migrations, verify the schema. Does not compile — CI already built.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { env } from "../src/lib/config";
import { logger } from "../src/lib/logger";
import { verifyMigrations } from "./migration-verify";

const execFileAsync = promisify(execFile);

function redactedDatabase(url: string): string {
  const parsed = new URL(url);
  return `${parsed.host}${parsed.pathname}`;
}

async function main(): Promise<void> {
  logger.info("deploy.start", {
    environment: env.NODE_ENV,
    database: redactedDatabase(env.DATABASE_URL),
    ...(env.BUILD_ID !== undefined ? { buildId: env.BUILD_ID } : {}),
  });

  if (env.NODE_ENV !== "production") {
    throw new Error("pnpm deploy:prepare is for NODE_ENV=production (staging or live).");
  }

  const status = await execFileAsync("pnpm", ["exec", "prisma", "migrate", "status"], {
    env: process.env,
  });
  logger.info("deploy.migrate_status", {
    stdout: status.stdout.trim().slice(0, 500),
  });

  logger.info("deploy.migrate");
  await verifyMigrations(env.DATABASE_URL);
  logger.info("deploy.prepared", {
    ...(env.BUILD_ID !== undefined ? { buildId: env.BUILD_ID } : {}),
  });
}

void main().catch((error: unknown) => {
  logger.error("deploy.failed", {
    message: error instanceof Error ? error.message : String(error),
  });
  process.exit(1);
});
