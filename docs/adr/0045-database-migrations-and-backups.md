# ADR-0045: Database migrations and backups

- Status: Accepted
- Date: 2026-09-13
- Amends: [ADR-0003](0003-postgresql.md), [ADR-0004](0004-prisma.md)

## Context

Architecture §5 said migrations are committed SQL and must stay
backward-compatible with the deployed binary. §15 said backups are
automated and restore is tested before real orders. Prompt 25.3 asked
for an explicit workflow, backup policy, restore procedure, verification,
rollback strategy, and a production runbook — and that a developer can
reproduce the database from migrations.

`prisma migrate deploy` already rebuilds an empty database. Nothing
compared `_prisma_migrations` to every committed folder, nothing dumped
or restored the cluster, and rollback was one sentence.

Hosting is still unresolved. The policy must not invent a vendor.

## Decision

1. **`docs/database.md` is the contract.** Workflow, verification,
   backup, restore, rollback, and the production runbook live there.
2. **The database is reproduced from `prisma/migrations/`.**
   `pnpm db:migrate:deploy` on an empty PostgreSQL 16 database is
   sufficient. `pnpm db:reproduce` creates disposable `bikes_reproduce`,
   verifies, and drops it. `pnpm db:verify` deploys a chosen URL and
   requires an exact match of applied names to committed folders.
   Prisma schema diffs are not the gate: generated columns and FTS
   indexes exist only in SQL.
3. **CI verifies reproduction** with `pnpm db:reproduce` in the check
   job. Integration tests keep the same assertion on `bikes_test`.
4. **No down migrations.** Rollback is (a) redeploy the previous build
   on a backward-compatible schema, or (b) restore the pre-migration
   dump. Breaking shape changes use expand / contract across releases.
5. **Backups are custom-format `pg_dump`** (`pnpm db:backup`) at least
   daily, plus an on-demand dump before every production migrate.
   Restore is `pnpm db:restore` and requires explicit confirmation.
   Provider PITR is welcome when hosting exists; dumps are the floor.
6. **Restore is a release gate.** An untested backup is not a backup.
   Drill once before real orders, then quarterly.

## Alternatives considered

**Down SQL in every folder.** Rejected: Prisma does not apply it, and
invertible migrations are a fiction for data backfills. Restore +
expand/contract is the honest path.

**Rely on the host snapshot UI only.** Rejected until a host is chosen.
Scripts give developers a path that works on local PostgreSQL today.

**`prisma db push` in development.** Rejected: it teaches a schema that
cannot be reproduced from folders.

**Keep verification as a partial `arrayContaining` in one test.**
Rejected: a new folder could land without being named.

## Consequences

- Operators have a single runbook for production migrate.
- `backups/` is gitignored. Dumps are PII.
- `pnpm check` and CI grow a `db:verify` step that needs PostgreSQL.

## When to revisit

- A hosting ADR names managed PostgreSQL, snapshot APIs, and PITR.
- A seed pipeline loads catalogue onto staging (ADR-0043).
- Prisma ships a supported down-migration story we actually need.
