# Database migrations, backups, and restore

Status: authoritative companion to ADR-0045, ADR-0003, ADR-0004, and
`docs/environments.md`. The schema lives in `prisma/schema.prisma`. SQL
is in `prisma/migrations/`.

A developer can reproduce the database from this repository: create an
empty PostgreSQL 16 database and run `pnpm db:migrate:deploy` (or
`pnpm db:reproduce` for a throwaway proof). No hand-applied SQL, no
schema that exists only on one laptop.

## Migration workflow

1. Change the relevant section of `prisma/schema.prisma`. Constraints
   Prisma cannot express go in the generated SQL after you review it
   (partial unique indexes, check constraints, generated columns).
2. `pnpm db:migrate` on the **local** `bikes` database. That needs
   `CREATEDB` for Prisma's shadow database. Do not run `migrate dev`
   against staging or production.
3. Open the new `prisma/migrations/<timestamp>_<name>/migration.sql`.
   Check for dropped columns, rewritten tables, and lock-heavy
   rewrites. Expand/contract only (see rollback).
4. `pnpm db:generate` so `src/generated/` matches.
5. Add or update tests. Integration coverage for a schema invariant
   belongs in `tests/integration/migrations.test.ts`.
6. `pnpm db:verify` against local `DATABASE_URL`, then `pnpm check`.
7. Commit the schema, the SQL folder, and `migration_lock.toml`
   together. Reviewers treat SQL as production code.

Never edit an already-merged migration folder. If a merged file is
wrong, add a new migration. Never apply SQL by hand in any named
environment.

| Command                  | Use for                                 | Safe on production           |
| ------------------------ | --------------------------------------- | ---------------------------- |
| `pnpm db:migrate`        | Create + apply a development migration  | no                           |
| `pnpm db:migrate:deploy` | Apply committed folders in order        | yes                          |
| `pnpm db:status`         | Pending vs applied                      | yes (read)                   |
| `pnpm db:verify`         | Deploy, exact folder match, schema diff | yes (writes only if pending) |
| `pnpm db:reproduce`      | Empty `bikes_reproduce`, verify, drop   | n/a (local/CI)               |
| `pnpm db:generate`       | Client codegen only                     | n/a                          |

`pnpm db:reproduce` refuses to create or drop `bikes`, `postgres`,
templates, or `*_test`. Override the name with `REPRODUCE_DATABASE`.
`REPRODUCE_KEEP=yes` leaves the database. `REPRODUCE_REPLACE=yes`
drops an existing disposable database first.

## Migration verification

`pnpm db:verify` is the gate:

1. `prisma migrate deploy`
2. `prisma migrate status` must say the schema is up to date
3. `_prisma_migrations` names must equal the committed folder names
   CI and `pnpm check` run `pnpm db:reproduce` (empty `bikes_reproduce`,
   then drop). `tests/integration/migrations.test.ts` re-checks the same
   inventory on isolated `bikes_test`.

`pnpm db:verify` is the operator command against a chosen
`DATABASE_URL` (staging, production, a restored copy).

A green verify/reproduce means every committed folder applied and is
recorded. It does not mean Prisma's schema file is a lossless model of
SQL: generated columns and FTS indexes live only in the migration
files, by design. Those invariants are asserted in
`tests/integration/migrations.test.ts`.

It also does not mean the _data_ is sound; that is backup restore plus
application smoke.

## Backup policy

Hosting is still unresolved (`docs/architecture.md` §16). The policy
does not name a vendor. Whoever operates PostgreSQL must meet it.

| Rule          | Requirement                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| Frequency     | Automated full dump at least daily. Extra on-demand dump immediately before every production migrate    |
| Format        | `pg_dump --format=custom` (`pnpm db:backup`)                                                            |
| Retention     | 14 daily copies; one monthly copy for 3 months                                                          |
| Storage       | Encrypted at rest, not in git, not on the app host's ephemeral disk as the only copy                    |
| Access        | Same ownership as `DATABASE_URL` (platform / DBA)                                                       |
| Contents      | Treat as production PII (emails, phones, addresses)                                                     |
| Point-in-time | Prefer provider WAL/PITR when the host offers it; daily dumps are the floor                             |
| Staging       | Restore only sanitized dumps. Do not copy live customer PII onto staging                                |
| Drill         | Restore onto a throwaway database and `pnpm db:verify` at least once before real orders, then quarterly |

`pnpm db:backup` writes `backups/bikes-<ISO>.dump` (or `BACKUP_DIR`, or
an explicit path). The `backups/` directory is gitignored.

An untested backup is not a backup. The first restore drill is a
release gate for taking real orders (`docs/architecture.md` §15).

## Restore procedure

Local or CI loopback:

```bash
# 1. Confirm the target URL is the database you intend to wipe
pnpm env:check

# 2. Drop, recreate, restore (destroys DATABASE_URL)
CONFIRM_RESTORE=yes pnpm db:restore backups/bikes-….dump

# 3. Catch up if the dump predates HEAD
pnpm db:migrate:deploy
pnpm db:verify
```

Non-loopback hosts (staging, production) also require
`CONFIRM_PRODUCTION_RESTORE=yes`. Restore always drops and recreates
the target database; it does not `--clean` in place.

After restore:

1. `pnpm db:status` — history must match the dump, then deploy any
   newer folders from HEAD.
2. Application smoke: health, one catalogue read, one staff login on
   staging. Production smoke is the runbook below.
3. If the dump is used for staging, confirm it was sanitized.

`pg_restore --clean` replaces objects. It is not a merge.

## Rollback strategy

Prisma does not ship down migrations in this repository. We do not add
them. Rollback is one of two moves:

1. **Application rollback** — redeploy the previous build. This is the
   default and is only safe because every migration is
   **backward-compatible** with the outgoing application (expand /
   contract). The previous binary must still run on the new schema.
2. **Data rollback** — restore the on-demand dump taken immediately
   before the migration, then start the previous build. Use this when
   the migration wrote or destroyed data incorrectly.

Do not `DELETE FROM _prisma_migrations` to "undo" a folder. Do not
hand-edit production tables to invert a migration.

Expand / contract for breaking shape changes:

| Release | Schema                      | Application        |
| ------- | --------------------------- | ------------------ |
| N       | Add the new column / table  | Write both shapes  |
| N+1     | Backfill; app reads the new | Still accept old   |
| N+2     | Drop the old column / table | Only the new shape |

A drop that the outgoing binary still needs is a failed review, not a
rollback plan.

## Production migration runbook

Do this on the production database only after the same folders ran on
**staging** (`docs/environments.md`). One operator. Do not mix with
feature work.

1. **Freeze.** CI on the release commit is green (the `CI` gate,
   ADR-0044). No other migration is in flight.
2. **Announce.** Short maintenance window if the SQL takes an ACCESS
   EXCLUSIVE lock. Most additive migrations do not.
3. **Backup.** `DATABASE_URL=<production> pnpm db:backup` (or the
   provider's snapshot). Wait until the file or snapshot is listed and
   readable. Record the path.
4. **Status.** `DATABASE_URL=<production> pnpm db:status` — expect
   pending folders that match the release, nothing else.
5. **Migrate.** `DATABASE_URL=<production> pnpm db:migrate:deploy`.
   This is the only write. Do not run `migrate dev`.
6. **Verify.** `DATABASE_URL=<production> pnpm db:verify`.
7. **Config.** `NODE_ENV=production pnpm env:check` against production
   secrets (no `NEXT_PHASE`).
8. **Start** the new artifact (`next start`). HTTPS and HSTS apply
   (ADR-0041).
9. **Smoke.** `/api/health`, storefront home, one published product,
   staff can open the admin queue. No demo accounts exist here.
10. **Abort.** If smoke fails and the schema is still backward
    compatible, redeploy the previous build and leave the schema. If
    data is wrong, restore the pre-migration dump
    (`CONFIRM_RESTORE=yes CONFIRM_PRODUCTION_RESTORE=yes pnpm db:restore …`),
    `pnpm db:verify`, then the previous build.

Do not take real orders until a restore drill has succeeded once
against a throwaway database using a production-shaped dump (sanitized
if that dump leaves the production network).

## Related

- ADR-0045 (this policy)
- ADR-0003 / ADR-0004 (PostgreSQL, Prisma)
- ADR-0038 (`bikes_test`)
- `docs/environments.md`
- `docs/ci.md`
