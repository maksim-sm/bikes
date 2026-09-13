import { readFile } from "node:fs/promises";
import path from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ensureTestDatabase, TEST_DATABASE_URL } from "./harness";

describe("committed migrations on bikes_test", () => {
  const sql = new Client({ connectionString: TEST_DATABASE_URL });

  beforeAll(async () => {
    await ensureTestDatabase();
    await sql.connect();
  }, 60_000);

  afterAll(async () => {
    await sql.end();
  });

  it("records every committed migration against PostgreSQL", async () => {
    const lock = await readFile(
      path.join(process.cwd(), "prisma/migrations/migration_lock.toml"),
      "utf8",
    );
    expect(lock).toContain('provider = "postgresql"');

    const applied = await sql.query<{ migration_name: string }>(
      `SELECT migration_name FROM _prisma_migrations
       WHERE rolled_back_at IS NULL
       ORDER BY finished_at`,
    );
    expect(applied.rows.map((row) => row.migration_name)).toEqual(
      expect.arrayContaining([
        "20260911162929_init",
        "20260911165056_inventory_foundations",
        "20260912160000_payment_status_lifecycle",
        "20260912180000_delivery_configuration",
        "20260913060000_notification_outbox",
      ]),
    );
  });

  it("keeps race-safe inventory counters and webhook uniqueness in SQL", async () => {
    const available = await sql.query<{ is_generated: string }>(
      `SELECT is_generated FROM information_schema.columns
       WHERE table_name = 'inventory_items' AND column_name = 'available'`,
    );
    expect(available.rows[0]?.is_generated).toBe("ALWAYS");

    const checks = await sql.query<{ conname: string }>(
      `SELECT conname FROM pg_constraint
       WHERE conname IN (
         'inventory_items_reserved_le_on_hand_chk',
         'inventory_items_on_hand_nonnegative_chk'
       )`,
    );
    expect(checks.rows).toHaveLength(2);

    const events = await sql.query<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes
       WHERE indexname = 'payment_events_provider_provider_event_id_key'`,
    );
    expect(events.rows).toHaveLength(1);

    const methods = await sql.query<{ code: string }>(
      `SELECT code FROM delivery_methods ORDER BY code`,
    );
    expect(methods.rows.map((row) => row.code)).toEqual([
      "by-regional",
      "minsk-courier",
      "minsk-pickup",
    ]);
  });
});
