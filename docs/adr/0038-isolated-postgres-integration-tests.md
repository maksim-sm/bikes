# ADR-0038: Isolated PostgreSQL integration tests

- Status: Accepted
- Date: 2026-09-13
- Amends: [ADR-0008](0008-testing-strategy.md)

## Context

ADR-0008 requires repository and transaction tests against real PostgreSQL, never
a mock or SQLite. The first concurrency suite lived next to inventory services
and created `bikes_test` ad hoc. Cross-module paths — checkout, payment events,
refunds, authentication — still had no SQL suite, and CI did not provision a
database.

## Decision

Integration tests live under `tests/integration/` and share one isolated
database (`bikes_test` by default, overridable with `TEST_DATABASE_URL`).

Binding rules:

1. **The suite never writes to the development `bikes` database.** Setup
   creates `bikes_test` if missing and runs `prisma migrate deploy` against that
   URL.
2. **Commerce tables are truncated between tests.** Delivery seed rows from
   migrations stay. Concurrent reservation tests use separate Prisma clients
   against the same committed data; they cannot share a rolled-back transaction.
3. **Vitest runs the integration project sequentially** (`fileParallelism:
false`) so truncates do not race.
4. **CI starts PostgreSQL 16** and runs `pnpm check`, which includes both the
   unit and integration projects.

Payment attempts and webhook events are persisted through
`createPrismaPaymentRepository`. The mock provider from ADR-0005 remains the
only provider the suite talks to.

## Alternatives considered

**Wrap every test in a single Prisma transaction and roll it back.** Rejected
for concurrency tests: two buyers must see committed `reserved` counters on
separate connections. Truncate-between-tests is the isolation mechanism that
works for both sequential repository tests and races.

**One database shared with local development.** Rejected: a failed test would
leave receipts and sessions in the database the storefront reads.

## Consequences

- Local `pnpm test` needs PostgreSQL. `pnpm test:unit` stays offline.
- Adding a table that integration tests insert into requires listing it in the
  harness truncate list if it should not survive a test.
- The Prisma payment repository is now the persistence path the suite trusts;
  compose can keep the in-memory demo store until production wiring lands.

## When to revisit

- Template databases or parallel schemas become faster than truncate-and-reuse
  while still running real PostgreSQL (already listed in ADR-0008).
- Compose switches storefront payments onto the Prisma repository, at which
  point these tests become the regression net for that cutover.
