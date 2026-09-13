# ADR-0044: Required CI stages

- Status: Accepted
- Date: 2026-09-13
- Amends: [ADR-0008](0008-testing-strategy.md), [ADR-0039](0039-playwright-e2e-journeys.md)

## Context

ADR-0008 said CI would run lint, typecheck, unit, and integration, with
end-to-end against a built app. ADR-0038 added Postgres to CI. ADR-0039
put Playwright in a second job and kept it out of `pnpm check`.

The workflow still ran those as two jobs with no aggregator: a red e2e
job did not make a single “CI” check fail, `pnpm check` hid the stage
order inside one script, and nothing audited dependencies. Prompt 25.2
asked for explicit stages and forbade a green build that silently
skipped critical tests.

`pnpm audit --prod` currently reports high findings only on Prisma
transitive packages we do not execute (`mysql2`, `deepmerge-ts`).
Failing the world on those would pin the pipeline to Prisma’s release
cadence.

## Decision

1. **CI has eight required stages**, listed in `docs/ci.md`: install,
   lint, typecheck, unit, integration, build, e2e, security/dependency
   checks.
2. **A `gate` job named `CI` requires `audit`, `check`, and `e2e`.**
   `if: always()` plus an explicit `test "$JOB" = success` means a
   skipped or cancelled critical job is a red workflow.
3. **E2E always runs on GitHub Actions.** The runner can install
   Chromium. “Where environment permits” means a laptop without
   browsers may omit Playwright; CI may not.
4. **Specs may not use `.skip` or `.only`.** `pnpm ci:assert-tests`
   fails the tree if those appear, or if a suite directory is empty.
   Vitest sets `passWithNoTests: false` and `allowOnly: false` when
   `CI` is set. Playwright already sets `forbidOnly` in CI.
5. **`pnpm audit:deps` fails on unreviewed high/critical production
   advisories.** Documented exceptions live in
   `docs/dependency-advisories.json` and must name a GHSA and a reason.
6. **`pnpm check` keeps the same stages except E2E**, so a laptop
   without Chromium can still gate a commit. Integration still needs
   PostgreSQL; it does not skip.

## Alternatives considered

**Leave e2e as an optional check.** Rejected: that is a silent skip of
the only browser journeys.

**Fail `pnpm audit --prod` with no allowlist.** Rejected today: the
hits are unused Prisma drivers. The allowlist makes the exception
visible.

**Put every stage in one job.** Rejected: e2e and audit do not need
Postgres; parallel jobs keep the wall clock down. The gate job is what
makes them all required.

**Keep `pnpm check` as the only CI step.** Rejected: a single log line
hides which stage died and invites `|| true` later.

## Consequences

- GitHub branch protection should require the **CI** job, not `check`
  alone.
- Adding `.skip` to go green is a red build.
- Prisma bumps that remove `mysql2` / old `deepmerge-ts` should drop
  the matching allowlist rows.

## When to revisit

- Playwright can run against a seeded `next start` (ADR-0039 revisit).
- A hosting deploy workflow consumes this gate as its only input.
- Direct production dependencies show a high/critical advisory.
