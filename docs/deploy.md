# Reproducible deployment

Status: authoritative companion to ADR-0046, `docs/environments.md`,
`docs/database.md`, and `docs/ci.md`. Hosting is still unresolved
(`docs/architecture.md` §16). This document is the platform-neutral
procedure. Swap in the host's secret store and process supervisor when
that ADR lands. Do not invent a second compile on the server.

A release is **one git SHA**, **one CI `next build`**, **one set of
injected process variables**, **one migrate**, **one `next start`**.

## Production build

CI (`docs/ci.md`) already runs `pnpm build` after tests. That artifact
is what staging and production start.

- `next build` sets `NODE_ENV=production` and `NEXT_PHASE=phase-production-build`.
  Secrets are not required at compile time (ADR-0041).
- Do not run `next build` again on the host with different code or
  flags. If the host must compile, it compiles **that SHA** with the
  same Node/pnpm versions (`.nvmrc`, `packageManager`).
- Set `BUILD_ID` to the git SHA (or image digest) of that artifact.
  The process echoes it on `process.start` and `/api/health`.

```bash
# On the build agent (already `pnpm build` in CI)
export BUILD_ID="$(git rev-parse --short HEAD)"
```

The compiled output is `.next/`. Keep the previous `.next` (or image
tag) until the new process is ready — that is the rollback binary.

## Environment injection

The application reads only `src/lib/config.ts`. The host injects
variables into the **process environment** of `deploy:prepare` and
`next start`. Same names, different values per named environment
(`docs/environments.md`). Never bake `AUTH_SECRET` or `DATABASE_URL`
into the image.

Required for staging and production `next start`:

| Variable       | Rule                                   |
| -------------- | -------------------------------------- |
| `NODE_ENV`     | `production`                           |
| `APP_URL`      | `https://` public origin               |
| `DATABASE_URL` | That environment's Postgres only       |
| `AUTH_SECRET`  | ≥32 characters, unique per environment |
| `BUILD_ID`     | Artifact identity (recommended)        |
| `LOG_LEVEL`    | `info` or `warn`                       |
| `APP_LOCALE`   | `ru`                                   |

```bash
NODE_ENV=production pnpm env:check
```

That is the same schema `next start` will load. Do not set `NEXT_PHASE`.

## Database migration step

Migrations are an explicit step **before** the new binary receives
traffic (`docs/database.md`).

```bash
# 1. On-demand dump (production)
DATABASE_URL=<production> pnpm db:backup

# 2. Env + migrate + verify (does not start HTTP)
NODE_ENV=production BUILD_ID=<sha> pnpm deploy:prepare
```

`pnpm deploy:prepare` logs `deploy.start`, runs `prisma migrate status`,
applies committed folders, and requires `_prisma_migrations` to match
the tree. It refuses `NODE_ENV` other than `production`.

Then start the artifact:

```bash
NODE_ENV=production BUILD_ID=<sha> pnpm start
```

## Health and readiness

| Probe     | Path          | 200 means                             | 503 means                         |
| --------- | ------------- | ------------------------------------- | --------------------------------- |
| Liveness  | `/api/health` | Process is serving (may be drain)     | Process is not HTTP-capable       |
| Readiness | `/api/ready`  | Config loaded and Postgres `SELECT 1` | Draining, or database unreachable |

Both are public JSON envelopes. Both are exempt from the https 308 so a
platform probe on `http://127.0.0.1` still works (ADR-0041, ADR-0046).

Point the load balancer **readiness** at `/api/ready`. Point **liveness**
at `/api/health`. Do not swap them: a 503 on liveness restarts a draining
process and drops in-flight checkouts.

## Graceful startup and shutdown

**Startup** (`src/instrumentation.ts`, Node runtime only):

1. Validate env (production secrets enforced).
2. Install `SIGTERM` / `SIGINT` handlers.
3. In production, `SELECT 1` against `DATABASE_URL`. Failure exits 1
   before the process is considered started.
4. Log `process.start` with `environment` and `buildId`.

The process is ready for the balancer when `/api/ready` is 200.

**Shutdown:**

1. Signal `SIGTERM` (or Ctrl-C).
2. The process sets the drain flag. `/api/ready` becomes 503.
   `/api/health` stays 200 with `draining: true`.
3. After 10 seconds it disconnects Prisma and exits 0.

Stop the balancer (or wait for ready 503) before sending `SIGTERM` if
the platform does not probe readiness automatically.

## Rollback procedure

Rollback is **the previous artifact + its env**, not a down migration.

1. If the new binary is wrong and the schema is still backward
   compatible: start the previous `.next` / image tag with the same
   `DATABASE_URL`. Leave the schema. Confirm `/api/ready`.
2. If the migration corrupted data: restore the pre-migrate dump
   (`docs/database.md`), `pnpm db:verify`, then start the previous
   artifact.
3. Log `deploy.rollback` in the operator notes with both `BUILD_ID`s.

Do not `DELETE FROM _prisma_migrations`. Do not run `migrate dev` on
staging or production.

## Deployment logs

Every deploy line is JSON through `lib/logger`. Grep these `message`
fields:

| Message                          | When                                            |
| -------------------------------- | ----------------------------------------------- |
| `deploy.start`                   | `pnpm deploy:prepare` begins                    |
| `deploy.migrate_status`          | Prisma status before apply                      |
| `deploy.migrate`                 | About to apply / verify                         |
| `deploy.prepared`                | Schema matches HEAD; safe to `next start`       |
| `deploy.failed`                  | Prepare aborted                                 |
| `process.start`                  | HTTP process accepted env (and DB ping in prod) |
| `process.start_failed`           | Production DB ping failed at boot               |
| `process.shutdown`               | SIGTERM/SIGINT; drain started                   |
| `http.request` / `http.response` | Per-request (existing)                          |

Never log secrets, cookie values, or raw `DATABASE_URL` (host + db name
only). Attach `BUILD_ID` when set so a request can be tied to an
artifact.

## Order of operations (checklist)

1. CI `CI` gate green on the SHA (`docs/ci.md`).
2. Keep the previous artifact.
3. Inject staging or production secrets. `NODE_ENV=production pnpm env:check`.
4. Production: on-demand `pnpm db:backup`.
5. `NODE_ENV=production BUILD_ID=<sha> pnpm deploy:prepare`.
6. `NODE_ENV=production BUILD_ID=<sha> pnpm start`.
7. Wait for `/api/ready` 200. Smoke `/api/health`, home, one product.
8. If smoke fails: rollback (above).

Staging first, then production, with the same artifact.

## Related

- ADR-0046 (this procedure)
- ADR-0041 / ADR-0043 / ADR-0045
- `docs/database.md` (migrate runbook)
- `docs/environments.md`
