# Architecture baseline audit

Date of audit: 2026-09-11
Repository: `github.com/maksim-sm/bikes`
Audited commit: `9704a6e` ("Initial commit")
Scope: read-only inspection. No application code was created or modified.

## 1. Headline finding

The repository is empty. It contains exactly one tracked file, `README.md`, whose
entire content is the heading `# bikes`. Git reports 3 objects in a single pack,
one commit, one branch (`main`), and no stashes or additional refs.

There is therefore **no existing application architecture to map**: no framework,
no package manager lockfile, no database, no ORM, no auth, no styling system, no
tests, and no deployment configuration. Every question in the task list about
"the existing stack" resolves to "not yet chosen".

Consequences for the surrounding tasks:

- **Dependency inventory**: empty. There is no `package.json`, so there are zero
  direct or transitive dependencies. Section 4 instead records the runtime
  toolchain actually installed and the currently published versions of the
  libraries a project of this shape would use.
- **Incomplete or conflicting code**: none, because there is no code. The
  incompleteness is the absence of a scaffold, not a defect inside one.

## 2. Verified environment inventory

Measured on the audit machine, not inferred from config:

| Tool                       | Version       | Notes                                                       |
| -------------------------- | ------------- | ----------------------------------------------------------- |
| Node.js                    | 22.14.0       | Active LTS line; satisfies Next.js `engines.node >= 20.9.0` |
| npm                        | 10.9.7        | Available                                                   |
| pnpm                       | 10.33.3       | Available                                                   |
| Yarn                       | 1.22.22       | Classic only                                                |
| Bun                        | not installed | —                                                           |
| Python                     | 3.12.3        | Not needed for the intended stack                           |
| Docker                     | not installed | Blocks local containerised Postgres                         |
| PostgreSQL client (`psql`) | not installed | No local database server present                            |
| Redis                      | not installed | No cache/queue backend present                              |

Other environment facts:

- Network egress is unrestricted, and the public npm registry is reachable
  (version lookups succeeded), so dependency installation will work.
- There is no Cloud Agent environment build (`no_finished_builds`) and no
  `.cursor/environment.json`, so no install or start script runs automatically.
  Any future CI or agent run starts from a bare checkout.
- No database, payment, SMTP, or object-storage secrets are present in the
  environment. Credentials will have to be provisioned before any integration
  work can be exercised end to end.

## 3. Target architecture map (proposed, not yet implemented)

The stated intent is a modular monolith for a Belarus-focused,
Russian-language bicycle ecommerce store. The following is a concrete shape
consistent with that intent; it is a proposal for review, not a decision already
encoded in the repository. It is elaborated and made binding in
`docs/architecture.md`, and the choices are recorded in `docs/adr/`. Those are
authoritative where they differ from the sketch below.

```
app/                     HTTP + rendering layer only (routes, layouts, server actions)
  (storefront)/          public catalogue, product pages, cart, checkout
  (account)/             customer auth'd area: orders, addresses
  admin/                 internal catalogue and order management
modules/                 the modular-monolith seam; one folder per domain
  catalog/               bicycles, categories, specs, variants, stock
  pricing/               price calculation, VAT, discounts, currency
  cart/                  cart aggregate and quantity rules
  orders/                order lifecycle, status transitions
  payments/              payment provider adapters
  delivery/              shipping zones and cost calculation
  identity/              users, sessions, roles
  media/                 image storage abstraction
lib/                     cross-cutting only: db client, logging, config, errors, i18n
db/                      schema definitions and migrations
tests/                   unit and integration suites
```

Module rules that make this a modular monolith rather than a layered blob:
each module owns its own database tables and exposes a single public entry
point (`modules/<name>/index.ts`); cross-module reads go through that entry
point rather than through another module's internals or tables; the `app/`
layer never touches the database directly.

Decisions still open, with the recommendation and its reason:

| Concern         | Recommendation                  | Reason                                                                                         |
| --------------- | ------------------------------- | ---------------------------------------------------------------------------------------------- |
| Framework       | Next.js (App Router)            | Server-rendered catalogue matters for SEO on a retail storefront                               |
| Package manager | pnpm                            | Already installed at 10.33.3; strict module resolution catches accidental cross-module imports |
| Database        | PostgreSQL                      | Relational order/inventory data with transactional integrity                                   |
| ORM             | Prisma, pinned to stable 7.10.0 | Settled in ADR-0004; see the version risk in section 5                                         |
| Auth            | Auth.js / NextAuth              | Sessions plus a role flag for admin access                                                     |
| Styling         | Tailwind CSS 4.x                | Utility-first; low ceremony for a small team                                                   |
| Tests           | Vitest                          | Fast unit tests; add Playwright later for checkout flows                                       |
| Deployment      | Not chosen                      | Depends on where Postgres will be hosted                                                       |

## 4. Dependency map

Current: **no dependencies.** No `package.json`, no lockfile, `node_modules`
absent.

Latest published versions observed at audit time, for the packages the proposal
above would pull in:

| Package       | Published version                          | Comment                                                                                  |
| ------------- | ------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `next`        | 16.3.4                                     | Requires Node >= 20.9.0; satisfied                                                       |
| `react`       | 19.3.0                                     | Matches current Next.js major                                                            |
| `drizzle-orm` | 0.45.2                                     | Stable                                                                                   |
| `prisma`      | 8.0.0-rc.13                                | `latest` dist-tag is a **release candidate**; last stable is 7.10.0 under the `prev` tag |
| `next-auth`   | 4.24.15 stable, 5.0.0-beta.32 under `beta` | v5 is still beta after a long run                                                        |
| `tailwindcss` | 4.3.3                                      | v4 config model differs substantially from v3                                            |
| `vitest`      | 5.0.0                                      | Stable                                                                                   |

## 5. Risks and unknowns

Technical risks:

1. **Prisma's `latest` tag is a prerelease.** Installing `prisma` without pinning
   yields `8.0.0-rc.13`. ADR-0004 selects Prisma and requires an exact pin to
   the stable `7.10.0` for both `prisma` and `@prisma/client`. This risk is
   mitigated but not eliminated: a careless dependency update can still pull the
   prerelease in.
2. **Auth.js v4 versus v5.** v4 is stable but on the older API; v5 remains in
   beta. Choosing v5 buys the App Router-native API at the cost of a beta
   dependency in the authentication path.
3. **No local database and no Docker.** Nothing can be migrated or
   integration-tested against Postgres until either Docker is installed or a
   hosted Postgres connection string is provided. This is the single biggest
   blocker to verifying any data-layer work.
4. **No CI and no agent environment config.** Without `.cursor/environment.json`
   or a GitHub Actions workflow, nothing enforces that the build, lint, and test
   commands keep working.
5. **Tailwind 4 breaking changes.** Most tutorials and snippets still assume v3's
   `tailwind.config.js`; mixing the two conventions is a common early mistake.

Unknowns requiring a product or business answer:

- Payment provider. Belarusian ecommerce typically integrates bePaid, WebPay, or
  ERIP. Each has a different redirect/callback model, and this choice shapes the
  `payments` module's interface. No provider credentials exist in the environment.
- Currency and pricing. BYN assumed; whether prices are also shown in USD or EUR,
  and how VAT is presented, is unspecified.
- Localisation scope. Russian-only, or Russian plus Belarusian? This determines
  whether routing needs a locale segment from the start — cheap now, expensive
  to retrofit.
- Delivery model. Courier, pickup points, Belpochta, or in-store pickup, and
  whether shipping cost varies by region.
- Catalogue complexity. Whether bicycles need variants (frame size, colour) and
  per-variant stock. This is a schema-shaping decision and is hard to change later.
- Admin requirements. Whether a custom admin area is in scope or an off-the-shelf
  CMS will manage the catalogue.
- Hosting target, which constrains the deployment and database choices.

## 6. Recommended next implementation step

**Scaffold the Next.js application once, at the repository root, with pnpm, and
commit it before any feature work.**

Concretely, that first step is: initialise the Next.js App Router project with
TypeScript and Tailwind, add the empty `modules/` directory structure from
section 3 with an `index.ts` per module, configure Vitest, set up ESLint and
Prettier, add a `.env.example` naming the variables the app will require
(database URL, auth secret, payment keys), and add a CI workflow that runs
install, lint, typecheck, build, and test. No domain logic yet.

Doing this first matters because the module boundaries in section 3 are cheap to
establish in an empty scaffold and expensive to impose on existing feature code.

Recommended order after that:

1. Database layer: choose the ORM, define the `catalog` schema, and wire the
   first migration. Requires the Postgres blocker from section 5 to be resolved.
2. Catalogue read path: product list and product detail pages rendered from real
   data, with Russian-language content and the i18n decision settled.
3. Identity: sessions and the admin role flag.
4. Cart and pricing in BYN.
5. Checkout and order creation, with payment left behind an interface.
6. Payment provider adapter, once the provider is chosen and credentials exist.
7. Delivery cost rules.
8. Admin catalogue and order management.
9. End-to-end checkout tests, then deployment.

Steps 1 and 2 are the ones worth starting immediately; step 6 cannot begin until
the product questions in section 5 are answered.
