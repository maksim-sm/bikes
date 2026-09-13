# Environments

Status: authoritative companion to ADR-0043 and `docs/architecture.md` §15.
Validated variables live in `src/lib/config.ts`. This document names the
four environments, maps them to `NODE_ENV`, lists every variable, and
records who owns each secret.

The four names are **local**, **test**, **staging**, and **production**.
They are operational labels. They are not four values of `NODE_ENV`.
Node still has three: `development`, `test`, and `production`.

## How the names map

| Name           | Purpose                                         | Process                        | `NODE_ENV`      | Database                            |
| -------------- | ----------------------------------------------- | ------------------------------ | --------------- | ----------------------------------- |
| **local**      | Developer workstation                           | `pnpm dev`                     | `development`   | Local `bikes`                       |
| **test**       | CI and automated suites                         | `pnpm test`, `pnpm check`, e2e | `test` or unset | CI Postgres + isolated `bikes_test` |
| **staging**    | Pre-production check of the production artifact | `next start` on a staging host | `production`    | Dedicated staging database          |
| **production** | Live storefront                                 | `next start`                   | `production`    | Production database                 |

`local` and `test` may use HTTP `APP_URL` and the compiled-in development
`AUTH_SECRET`. `staging` and `production` both run `NODE_ENV=production`:
Prisma repositories, no demo login buttons, https `APP_URL`, a real
`AUTH_SECRET`, and no default `DATABASE_URL` (ADR-0041).

`next build` also sets `NODE_ENV=production`. That is a compile step, not
a runtime environment. `NEXT_PHASE=phase-production-build` skips secret
enforcement so CI can compile without live credentials.

Do not introduce a `BIKES_ENV` variable until a hosting ADR needs to
distinguish staging from production in logs. Until then, the hostname and
the secret store are the disambiguation.

## Variable catalogue

### Validated in `src/lib/config.ts`

| Variable       | Meaning                                              | local                       | test                                         | staging                         | production                         |
| -------------- | ---------------------------------------------------- | --------------------------- | -------------------------------------------- | ------------------------------- | ---------------------------------- |
| `NODE_ENV`     | Process mode                                         | `development`               | `test` (Vitest)                              | `production`                    | `production`                       |
| `APP_URL`      | Public origin (canonical URLs, CSRF, payment return) | `http://localhost:3000`     | build: default; e2e: `http://127.0.0.1:3100` | `https://` staging origin       | `https://` live origin             |
| `APP_LOCALE`   | Catalogue locale (ADR-0009)                          | `ru`                        | `ru`                                         | `ru`                            | `ru`                               |
| `LOG_LEVEL`    | Logger threshold                                     | `debug`                     | `error` (Vitest)                             | `info`                          | `info` or `warn`                   |
| `DATABASE_URL` | Application PostgreSQL                               | local default allowed       | CI service URL                               | **required**, staging-only user | **required**, production-only user |
| `AUTH_SECRET`  | Guest-cart HMAC (≥32 characters)                     | compiled-in default allowed | not required for `next build`                | **required**, unique            | **required**, unique               |

Empty strings are treated as missing. Production `next start` fails if
`DATABASE_URL`, https `APP_URL`, or `AUTH_SECRET` is absent.

### Used by tooling, not the application schema

| Variable                  | Owner          | Where                         | Notes                                              |
| ------------------------- | -------------- | ----------------------------- | -------------------------------------------------- |
| `TEST_DATABASE_URL`       | Engineering    | Integration harness, CI       | Isolated `bikes_test`. Never the local `bikes` DB. |
| `TEST_DATABASE_ADMIN_URL` | Engineering    | Integration harness, CI       | `CREATEDB` so the harness can create `bikes_test`. |
| `BIKES_NEXT_DIST_DIR`     | Engineering    | Playwright / `next.config.ts` | `.next-e2e` so e2e can sit beside `next dev`.      |
| `VITEST`                  | Vitest         | `compose.ts`                  | Forces in-memory wiring for unit tests.            |
| `CI`                      | GitHub Actions | Playwright                    | Retries and reporters.                             |
| `NEXT_PHASE`              | Next.js        | `config.ts`                   | Detects `next build`. Do not set by hand.          |
| `NEXT_RUNTIME`            | Next.js        | `instrumentation.ts`          | Skips Node config on the edge runtime.             |

### Not validated yet (shape only)

These names are reserved in `.env.example` so the eventual provider hook
is visible. They must not be added to `config.ts` until application code
reads them.

| Variable           | Future owner       | When it becomes real                         |
| ------------------ | ------------------ | -------------------------------------------- |
| `PAYMENT_PROVIDER` | Finance + platform | A live `PaymentProvider` replaces the mock   |
| `MEDIA_DRIVER`     | Platform           | Object storage replaces the filesystem store |

## Local

Developer workstation. Copy `.env.example` to `.env.local`. PostgreSQL
must be reachable at `DATABASE_URL`. `pnpm db:migrate:deploy` applies
committed migrations. `pnpm dev` serves the demo catalogue, demo
identity, and mock payment stack (`NODE_ENV !== "production"`).

Demo staff: `staff@bikes.local` / `StaffPass12`. Demo customer:
`customer@bikes.local` / `CustomerPass12`. Those passwords are compiled
fixtures, not environment secrets. They must not exist as accounts in
staging or production.

`pnpm env:check` validates the current process environment without
starting the server.

## Test

CI (`.github/workflows/ci.yml`) starts PostgreSQL 16 and sets
`DATABASE_URL`, `TEST_DATABASE_URL`, and `TEST_DATABASE_ADMIN_URL`.
`pnpm check` compiles with `next build` and does **not** need
`AUTH_SECRET`. Integration tests talk only to `bikes_test` (ADR-0038).
Playwright drives `next dev` on port 3100 so the demo stack exists
(ADR-0039). GitHub Actions always runs that e2e job; the `CI` gate
fails if it is skipped (`docs/ci.md`, ADR-0044).

Test credentials in the workflow are ephemeral container defaults
(`bikes` / `bikes`). That is acceptable because the database dies with
the job. Do not reuse those credentials on staging or production.

## Staging

Same build artifact as production. Isolated database, isolated
`AUTH_SECRET`, https origin. `NODE_ENV=production`, so the demo stack
and demo login buttons are off.

A staging host is not provisioned in this repository yet (hosting is
still unresolved in architecture §16). The contract is:

1. Apply migrations to the **staging** database before the new build
   receives traffic.
2. Run `NODE_ENV=production pnpm env:check` (no `NEXT_PHASE`) against
   the staging secret set. Fail the deploy if it fails.
3. `next start` the same artifact that CI built.
4. Do not copy production customer PII onto staging unless it is
   sanitized first.
5. Do not point Playwright at staging by default. E2E depends on the
   demo stack.

Staging is useless until a seed pipeline can load catalogue and staff
into Postgres. That is a follow-up, not a reason to skip the definition.

## Production

Live storefront. Same artifact, different secrets and hostname.

1. Migrations on the production database, backward-compatible with the
   outgoing build (architecture §15).
2. `NODE_ENV=production pnpm env:check` against production secrets.
3. `next start`. HTTPS redirect and HSTS apply (ADR-0041).
4. Automated backups; restoration tested before real orders.
5. Rollback is redeploying the previous build.

Compose still wires the mock payment provider in every environment.
A live provider must land before money moves (`docs/security.md`).

## Secret ownership

No secret is committed. `.env` and `.env.*` are gitignored;
`.env.example` lists names with empty or local-only values.

| Secret                          | Generator                         | Owner                    | Store                                  | Rotation                                        |
| ------------------------------- | --------------------------------- | ------------------------ | -------------------------------------- | ----------------------------------------------- |
| `AUTH_SECRET`                   | `openssl rand -base64 32`         | Platform / security      | Host secret store (platform TBD)       | Compromise, or at least annually                |
| `DATABASE_URL` (incl. password) | Database provider                 | Platform / DBA           | Host secret store                      | Credential rotation or host move                |
| Staging `AUTH_SECRET`           | Same as production, **different** | Platform / security      | Staging secret store                   | Same as production; never share with production |
| Staging `DATABASE_URL`          | Staging database                  | Platform / DBA           | Staging secret store                   | Same; never share with production               |
| Demo passwords                  | Compiled constants                | Engineering (local/test) | Source                                 | Never deploy as real accounts                   |
| CI Postgres `bikes`/`bikes`     | Workflow                          | Engineering              | `.github/workflows/ci.yml` (ephemeral) | N/A                                             |
| Payment API / webhook secret    | Provider portal                   | Finance + platform       | Host secret store                      | Provider policy                                 |
| Object-storage keys             | Cloud provider                    | Platform                 | Host secret store                      | Provider policy                                 |
| SMTP / mail API                 | Mail provider                     | Platform                 | Host secret store                      | Provider policy                                 |

**Staging and production must never share `AUTH_SECRET` or `DATABASE_URL`.**
A leak of staging must not mint production guest-cart signatures or open
the live database.

Until the hosting ADR names a secret manager, the owner is the person
who can change the process environment on that host. Write the store
name into this table when that ADR lands.

## Adding a variable

1. Add it to the Zod schema in `src/lib/config.ts`.
2. Add it to `.env.example` with an empty or local-only value.
3. Add a row to the catalogue and, if it is a secret, to the ownership
   table in this document.
4. Read it through `env`. Do not read `process.env` from application
   code.
5. Write an ADR if the variable changes the architecture (a new
   provider, a second datastore, a cache).

`compose.ts` and a few login files still read `NODE_ENV` / `VITEST`
directly. That is a known boundary gap (`docs/security.md`), not a
licence to add more ad-hoc reads.

## Related

- ADR-0043 (this strategy)
- ADR-0041 (production secret enforcement)
- ADR-0038 / ADR-0039 (test databases and Playwright)
- `docs/architecture.md` §14–§16
- `pnpm env:check`
