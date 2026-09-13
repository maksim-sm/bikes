# Continuous integration

Status: authoritative companion to ADR-0044 and `docs/environments.md`
(the **test** environment). The workflow is `.github/workflows/ci.yml`.

CI exists to keep a broken tree off `main` and off any future deploy.
A green run means every critical stage ran and passed. A skipped
critical stage is a failure.

## Stages

| Stage                      | Job   | Command                                   | Required  |
| -------------------------- | ----- | ----------------------------------------- | --------- |
| 1. Install                 | all   | `pnpm install --frozen-lockfile`          | yes       |
| 2. Lint (and format)       | check | `pnpm lint`, `pnpm format:check`          | yes       |
| 3. Typecheck               | check | `pnpm db:generate`, `pnpm typecheck`      | yes       |
| 4. Unit tests              | check | `pnpm test:unit`                          | yes       |
| 5. Integration tests       | check | `pnpm test:integration`                   | yes       |
| 6. Build                   | check | `pnpm build`                              | yes       |
| 7. E2E                     | e2e   | `pnpm test:e2e`                           | yes on CI |
| 8. Security / dependencies | audit | `pnpm ci:assert-tests`, `pnpm audit:deps` | yes       |

The `CI` job (`gate`) needs `audit`, `check`, and `e2e`. If any of those
is skipped, cancelled, or failed, `gate` fails. GitHub required-status
should watch **CI**, not an individual stage.

## What each stage proves

- **Install** uses the lockfile. Drift is a red build, not a surprise
  on the next laptop.
- **Lint** includes the architecture boundary rules. Format check is
  beside it so Prettier cannot be “fixed later.”
- **Typecheck** runs after `prisma generate` so `src/generated/` exists.
- **Unit** is Vitest against `src/**/*.test.ts` with `passWithNoTests:
false`. An empty suite fails.
- **Integration** is Vitest against `tests/integration/**` on the CI
  PostgreSQL 16 service and isolated `bikes_test` (ADR-0038). There is
  no “skip if no database” branch.
- **Build** is `next build`. Secrets are not required (ADR-0041).
- **E2E** is Playwright on `next dev` :3100 (ADR-0039). Ubuntu runners
  can install Chromium, so CI always runs this job. Local `pnpm check`
  does **not** start a browser — that is the only permitted skip, and
  it is documented, not silent.
- **Security / dependencies** refuses `.skip` / `.only` in specs and
  fails on unreviewed high/critical production advisories
  (`docs/dependency-advisories.json`).

## Local vs CI

`pnpm check` is the laptop gate: assert-tests, lint, format, generate,
typecheck, unit, integration, build, audit. It needs local PostgreSQL
for integration tests. It does not run Playwright.

`pnpm test:e2e` is optional on a laptop (install Chromium first). On
GitHub Actions it is mandatory.

## Adding a test

Put unit tests next to the code (`src/**/*.test.ts`), SQL cases in
`tests/integration/`, journeys in `tests/e2e/`. Do not park a failing
case on `.skip` to go green. Fix it or delete it.

## Adding a dependency advisory exception

Only for a transitive package this shop does not execute (today: Prisma
optional MySQL / config merge). Add a `ghsa` + `reason` to
`docs/dependency-advisories.json`. A direct high/critical finding is a
version bump, not an exception.
