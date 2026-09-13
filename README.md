# bikes

Интернет-магазин велосипедов для Беларуси.

A Russian-language bicycle ecommerce store for the Belarusian market, built as a
modular monolith. This repository currently contains the application
foundation only — no business features yet.

## Requirements

| Tool       | Version         | Why                                            |
| ---------- | --------------- | ---------------------------------------------- |
| Node.js    | **24 or newer** | Enforced by `engines`; `.nvmrc` pins the major |
| pnpm       | 10 or newer     | Declared in `packageManager`                   |
| PostgreSQL | 16 or newer     | Required by Prisma migrations                  |

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
pnpm db:migrate:deploy
pnpm dev
```

The site is then at http://localhost:3000 and the health endpoint at
http://localhost:3000/api/health.

PostgreSQL must be running and match `DATABASE_URL` in `.env.local`. The default
is `postgresql://bikes:bikes@localhost:5432/bikes`. `pnpm db:migrate:deploy`
applies committed migrations to an empty database; `pnpm db:migrate` is the
development command that also creates new migrations and needs `CREATEDB` on
the database role (Prisma's shadow database).

## Scripts

| Command                  | Does                                                        |
| ------------------------ | ----------------------------------------------------------- |
| `pnpm dev`               | Development server with hot reload                          |
| `pnpm build`             | Production build                                            |
| `pnpm start`             | Serve a production build (run `build` first)                |
| `pnpm lint`              | ESLint, including the architecture boundary rules           |
| `pnpm lint:fix`          | ESLint with autofix                                         |
| `pnpm typecheck`         | `tsc --noEmit`                                              |
| `pnpm test`              | Unit and integration suites (Vitest)                        |
| `pnpm test:unit`         | Domain and application unit tests (no database)             |
| `pnpm test:integration`  | Real PostgreSQL suite against isolated `bikes_test`         |
| `pnpm test:e2e`          | Playwright journeys against `next dev` on port 3100         |
| `pnpm test:e2e:install`  | Download Chromium for local Playwright runs                 |
| `pnpm format`            | Rewrite files with Prettier                                 |
| `pnpm format:check`      | Fail if anything is unformatted                             |
| `pnpm env:check`         | Validate environment configuration without starting the app |
| `pnpm db:generate`       | Generate the Prisma client into `src/generated/`            |
| `pnpm db:migrate`        | Create and apply a development migration                    |
| `pnpm db:migrate:deploy` | Apply committed migrations (safe on an empty database)      |
| `pnpm db:status`         | Show whether the database is up to date                     |
| `pnpm check`             | Lint, format check, generate client, build, typecheck, test |

Before pushing, `pnpm check` is the one command worth remembering.

`pnpm db:migrate`, `pnpm db:migrate:deploy`, and `pnpm test:integration` write
to PostgreSQL. Integration tests use isolated `bikes_test`, never the
development `bikes` database. Everything else is safe to run repeatedly: none
of the remaining scripts call a third-party service or delete anything.
`pnpm format` is the only non-database command that
modifies files, and only by reformatting them.

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
    api/          Route Handlers: health and `/api/v1` (see docs/api.md)
  modules/        Domain modules — the modular-monolith seam
    catalog/ pricing/ cart/ orders/
    payments/ delivery/ identity/ media/ inventory/ audit/ notifications/
  ui/             Design system: tokens and domain-agnostic primitives
  lib/            Cross-cutting infrastructure with no domain knowledge
    config.ts     Validated environment configuration
    logger.ts     Structured JSON logging
    errors.ts     Error taxonomy
    http/         Envelope, validation, pagination, error mapping
    i18n/         Locale resolution, Russian messages, Intl formatting
    db.ts         Prisma client (imported only by module repositories)
prisma/           Schema and committed SQL migrations
  schema.prisma   Models grouped by owning module
  migrations/     Generated SQL, reviewed like code
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

Path aliases: `@/app/*`, `@/modules/*`, `@/lib/*`, `@/ui`. There is deliberately
no catch-all `@/*` alias.

## Design system

`src/ui` holds the visual foundation: design tokens plus a small set of
keyboard-accessible primitives — `Button`, `TextLink`, `Card`, `Dialog`, the
form fields, and the `Container`/`Stack`/`Cluster`/`Grid` layout primitives. It
is presentation only and may not import domain modules.

Run the app and open **`/ui-kit`** to see every primitive on one page. Tab
through it: each interactive element must show a visible focus ring, and the
dialog must trap focus and close on Escape.

Three rules matter more than the rest:

- **Use tokens, never literals.** Every colour, size, and spacing value comes
  from `src/ui/tokens.css`. Colour pairs there are annotated with their
  measured WCAG contrast ratio; if you add a colour, measure it first.
- **Use the real element.** A `<div>` with an onClick handler is not a button.
  `Button` renders a `<button>`, `TextLink` renders an anchor, and `Dialog` is
  built on the native `<dialog>` element so the browser provides focus
  trapping, Escape, and focus restoration.
- **Never remove the focus ring.** It is defined once, globally, on
  `:focus-visible`. If it clips, fix the layout.

All user-facing copy lives in `src/lib/i18n/messages/ru.ts`, never inline in a
component (ADR-0009). Prices are formatted from integer kopeks by
`formatPrice` (ADR-0010).

## Where does new code go?

| You are adding                                  | It belongs in                        |
| ----------------------------------------------- | ------------------------------------ |
| A page, layout, or route                        | `src/app/`                           |
| A business rule with no I/O                     | `src/modules/<name>/domain/`         |
| A use case that coordinates rules and data      | `src/modules/<name>/application/`    |
| A database query or third-party API call        | `src/modules/<name>/infrastructure/` |
| A visual primitive with no domain knowledge     | `src/ui/`                            |
| A user-facing string                            | `src/lib/i18n/messages/ru.ts`        |
| Something every module needs and no module owns | `src/lib/`                           |

If the answer is not obvious, the module boundaries in `docs/architecture.md`
decide it. See `src/modules/README.md` for the internal layering rules.

## Documentation

- `docs/architecture.md` — the architecture contract: what goes where and why.
- `docs/inventory.md` — on-hand, reserved, available, expiration, release, commit.
- `docs/api.md` — Route Handler envelope, validation, errors, auth, pagination.
- `docs/adr/` — decision records. Read these before proposing a change to the
  stack; each lists the conditions under which reopening it is legitimate.
- `docs/BASELINE.md` — the pre-implementation audit.
- `docs/notifications.md` — transactional email outbox and attempt history.
- `docs/seo.md` — storefront metadata, sitemap, robots, and structured data.

## Status

Foundation, visual system, database schema, application services, versioned
HTTP Route Handlers, and customer authentication with httpOnly sessions. No
catalogue UI, cart page, or checkout yet.
