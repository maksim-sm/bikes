# ADR-0046: Reproducible deployment

- Status: Accepted
- Date: 2026-09-13
- Amends: [ADR-0041](0041-security-headers-and-production-secrets.md),
  [ADR-0043](0043-four-environment-strategy.md),
  [ADR-0045](0045-database-migrations-and-backups.md)

## Context

Architecture §15 said one build, env-injected config, migrate before
traffic, and rollback by redeploying the previous binary. Health was a
liveness envelope with no database probe. Prompt 25.4 asked for a
reproducible deploy: production build, environment injection, migrate
step, health, readiness, graceful start/stop, rollback, and deploy logs.

Hosting is still unresolved. The decision cannot name a PaaS.

## Decision

1. **`docs/deploy.md` is the runbook.** Same CI artifact for staging and
   production. The host injects process env; it does not bake secrets
   into `.next`.
2. **`pnpm deploy:prepare`** (`NODE_ENV=production`) validates env,
   applies committed migrations, and verifies `_prisma_migrations`.
   It does not start HTTP. `pnpm start` is a separate step.
3. **`GET /api/health` is liveness** (200 while draining).
   **`GET /api/ready` is readiness** (Postgres `SELECT 1`, 503 when
   draining or the database is down). Both stay http-exempt for local
   probes. The app layer does not import `@/lib/db`; readiness uses `pg`.
4. **`src/instrumentation.ts`** on the Node runtime: enforce secrets,
   install `SIGTERM`/`SIGINT`, ping the database in production (exit 1
   on failure), log `process.start`. Drain lasts 10 seconds, then Prisma
   disconnects.
5. **Optional `BUILD_ID`** in `config.ts` identifies the artifact in
   health, ready, and deploy logs.
6. **Rollback** remains previous artifact, or dump restore if data is
   wrong (ADR-0045). No down migrations.

## Alternatives considered

**One `/api/health` that 503s when Postgres is down.** Rejected: a
liveness 503 restarts a process that is only waiting on a brief DB
blip, and it races shutdown.

**`prisma` from the route.** Rejected: `app/` must not import `@/lib/db`.

**Rebuild on the server.** Rejected: that is a second, unreproducible
compile. Compile once in CI (or from the same SHA with the same
tooling).

**Docker as the unit.** Deferred until the hosting ADR. The runbook
works for a systemd unit, a container, or a PaaS start command.

## Consequences

- Load balancers must be configured with two URLs.
- `pnpm deploy:prepare` needs production-shaped secrets and `CREATEDB`
  is not required (`migrate deploy` only).
- Architecture §15 points at `docs/deploy.md`.

## When to revisit

- A hosting ADR names the process supervisor, secret store, and
  artifact registry.
- Drain of 10s is too short for in-flight payments.
- A worker process is split out of the Next.js unit.
