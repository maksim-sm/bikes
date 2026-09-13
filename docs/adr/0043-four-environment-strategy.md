# ADR-0043: Four named environments

- Status: Accepted
- Date: 2026-09-13
- Amends: informal two-environment wording in `docs/architecture.md` §15

## Context

Architecture §15 named only local development and production, and said
staging would appear "when there is something to stage." Prompt 25.1
asked to define **local**, **test**, **staging**, and **production**, and
to document environment variables and secret ownership.

`NODE_ENV` has three values. The shop already uses all three:
`development` for `next dev`, `test` for Vitest, `production` for
`next start` (and for `next build`, which is not a runtime). Test and
staging were implicit. Nobody owned `AUTH_SECRET` or `DATABASE_URL`.

Hosting is still unresolved (architecture §16). This ADR does not pick a
platform or provision a staging host.

## Decision

1. **The named environments are local, test, staging, and production.**
   The contract is `docs/environments.md`.
2. **Staging and production both use `NODE_ENV=production`.** They share
   the CI build artifact and differ by hostname, database, and secrets.
   Local uses `development`. Test uses `test` (Vitest) or the local demo
   stack (Playwright on `next dev`).
3. **`next build` is not an environment.** `NEXT_PHASE=phase-production-build`
   continues to skip secret enforcement (ADR-0041) so CI can compile.
4. **Secret ownership is recorded in `docs/environments.md`.** Platform /
   security owns `AUTH_SECRET`. Platform / DBA owns `DATABASE_URL`.
   Staging and production never share those two values. Demo passwords
   stay compiled fixtures for local and test only.
5. **A staging host is defined before it is provisioned.** Deploy order
   when it exists: migrate the staging database, `NODE_ENV=production
pnpm env:check`, then `next start`. No production PII on staging
   without sanitization.
6. **Do not add `BIKES_ENV` yet.** Hostname and the secret store already
   tell staging from production. Add the variable when a hosting ADR
   needs it in logs or health.

## Alternatives considered

**Keep two environments until a host exists.** Rejected: test already
runs in CI, and production secret rules are undefined for a future
staging replica. Naming them now stops a second "production-shaped"
environment from being invented ad hoc.

**Give staging `NODE_ENV=development` so the demo catalogue works.**
Rejected: staging must exercise the production artifact (Prisma, https
cookies, no demo login). A seed pipeline is the right follow-up.

**Put secrets in the Zod schema for payment and media now.** Rejected:
`config.ts` validates only what the process reads. Placeholder names
stay in `.env.example` until a provider is wired.

**Redis or a shared secret manager as a prerequisite.** Rejected: one
process per environment; the secret store is a hosting decision.

## Consequences

- Architecture §15 talks about four named environments and one database
  **per environment**.
- `.env.example` is grouped by local / test / shared / future providers.
- A later hosting ADR fills in the secret-store product name and the
  staging hostname.

## When to revisit

- A hosting platform and secret manager are chosen.
- A seed pipeline can load catalogue and staff into staging Postgres.
- A live payment or mail provider adds secrets to `config.ts`.
