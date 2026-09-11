# bikes

Интернет-магазин велосипедов для Беларуси.

A Russian-language bicycle ecommerce store for the Belarusian market, built as a
modular monolith. This repository currently contains the application
foundation only — no business features yet.

## Requirements

| Tool    | Version         | Why                                            |
| ------- | --------------- | ---------------------------------------------- |
| Node.js | **24 or newer** | Enforced by `engines`; `.nvmrc` pins the major |
| pnpm    | 10 or newer     | Declared in `packageManager`                   |

With nvm:

```bash
nvm install   # reads .nvmrc
nvm use
corepack enable   # provides the pnpm version pinned in package.json
```

## Setup

```bash
git clone https://github.com/maksim-sm/bikes.git
cd bikes
nvm use
pnpm install
cp .env.example .env.local
pnpm dev
```

The site is then at http://localhost:3000 and the health endpoint at
http://localhost:3000/api/health.

No database is required yet; there is no data layer. Once one is added, this
section will gain a migration step.

## Scripts

| Command             | Does                                                        |
| ------------------- | ----------------------------------------------------------- |
| `pnpm dev`          | Development server with hot reload                          |
| `pnpm build`        | Production build                                            |
| `pnpm start`        | Serve a production build (run `build` first)                |
| `pnpm lint`         | ESLint, including the architecture boundary rules           |
| `pnpm lint:fix`     | ESLint with autofix                                         |
| `pnpm typecheck`    | `tsc --noEmit`                                              |
| `pnpm format`       | Rewrite files with Prettier                                 |
| `pnpm format:check` | Fail if anything is unformatted                             |
| `pnpm env:check`    | Validate environment configuration without starting the app |
| `pnpm check`        | Everything CI runs: lint, format check, typecheck, build    |

Before pushing, `pnpm check` is the one command worth remembering.

All scripts are safe to run repeatedly: none of them writes to a database,
calls a third-party service, or deletes anything. `pnpm format` is the only one
that modifies files, and only by reformatting them.

## Configuration

Environment variables are declared, validated, and typed in exactly one place:
`src/lib/config.ts`. Nothing else in the codebase reads `process.env`.

Validation runs once at startup, so a missing or malformed value fails
immediately with a message naming the variable, rather than surfacing as a
confusing error later. `.env.example` documents every variable; copy it to
`.env.local`, which is git-ignored.

To add a variable: add it to the schema in `src/lib/config.ts`, add it to
`.env.example`, and read it through `env` rather than `process.env`.

## Project structure

```
src/
  app/            Routing and rendering only (Next.js App Router)
    api/health/   Liveness endpoint
  modules/        Domain modules — the modular-monolith seam
    catalog/ pricing/ cart/ orders/
    payments/ delivery/ identity/ media/
  lib/            Cross-cutting infrastructure with no domain knowledge
    config.ts     Validated environment configuration
    logger.ts     Structured JSON logging
    errors.ts     Error taxonomy
scripts/          Operational scripts, run outside the application
docs/             Architecture contract and decision records
```

Dependencies point one way only:

```
app/  ->  modules/  ->  lib/
```

and inside a module:

```
infrastructure/  ->  application/  ->  domain/
```

**These rules are enforced by ESLint, not by convention.** `pnpm lint` fails if
the app layer imports the database, if a module is imported through anything
other than its public `index.ts`, if `lib/` depends on a domain module, or if a
`domain/` folder reaches for configuration or I/O. A lint error from
`no-restricted-imports` is a design error, not a style complaint.

Path aliases: `@/app/*`, `@/modules/*`, `@/lib/*`. There is deliberately no
catch-all `@/*` alias.

## Where does new code go?

| You are adding                                  | It belongs in                        |
| ----------------------------------------------- | ------------------------------------ |
| A page, layout, or route                        | `src/app/`                           |
| A business rule with no I/O                     | `src/modules/<name>/domain/`         |
| A use case that coordinates rules and data      | `src/modules/<name>/application/`    |
| A database query or third-party API call        | `src/modules/<name>/infrastructure/` |
| Something every module needs and no module owns | `src/lib/`                           |

If the answer is not obvious, the module boundaries in `docs/architecture.md`
decide it. See `src/modules/README.md` for the internal layering rules.

## Documentation

- `docs/architecture.md` — the architecture contract: what goes where and why.
- `docs/adr/` — decision records. Read these before proposing a change to the
  stack; each lists the conditions under which reopening it is legitimate.
- `docs/BASELINE.md` — the pre-implementation audit.

## Status

Foundation only. No catalogue, cart, checkout, database, or authentication yet.
The module folders exist so that the first feature has an unambiguous home.
