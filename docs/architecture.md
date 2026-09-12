# Architecture contract

Status: authoritative. This document defines where code belongs and which
dependencies are permitted. It is a contract, not a tutorial: when a rule here
conflicts with convenience, the rule wins or the document is amended in the same
pull request as the exception.

Scope: the Belarus-focused, Russian-language bicycle ecommerce store in this
repository, built as a **modular monolith** — one deployable application, one
database, with enforced internal boundaries.

Companion documents: `docs/BASELINE.md` records the audit this contract was
built on and the toolchain measured on the machine. `docs/adr/` records the
decisions behind it — when an ADR and this document disagree, the most recent
accepted ADR is correct and this document needs updating.
`docs/inventory.md` defines on-hand, reserved, available, expiration, release,
and commit. `docs/api.md` is the external HTTP contract. `docs/auth.md`
defines principals, staff titles, and customer isolation. `docs/catalog.md`
defines storefront listing filters (PostgreSQL, not Elasticsearch).

Implementation status: the application foundation exists — Next.js App Router,
TypeScript, the `src/` layout below, configuration validation, the ESLint
boundary rules, the design system, the Prisma schema through the inventory
ledger, application services, and versioned Route Handlers under `/api/v1`.
Cookie sessions and customer auth live in `identity`. Prisma repositories
exist for auth tables and catalog listing; other modules still use in-memory
ports. Integration and end-to-end test tiers are still targets. Storefront
product, catalog, and guest-cart pages exist; there is no account UI yet.

## 1. Why a modular monolith

The store has one team, one database, and a single transactional core (a
checkout must reserve stock and create an order atomically). Splitting that
across services would buy network partitions and distributed transactions in
exchange for independent scaling that nothing here needs.

What we take from service-oriented design is the boundary discipline: modules
own their data and talk through published interfaces. What we reject is the
network hop. **Do not introduce a second deployable, a message broker, or a
service mesh.** If a module genuinely needs to scale independently later, the
boundaries defined here are what make extracting it possible.

## 2. Directory structure

```
src/
  app/                    Delivery layer: routing, rendering, HTTP only
    (storefront)/         Public: catalogue, product, cart, checkout
    (account)/            Authenticated customer area
    admin/                Staff-only catalogue and order management
    api/                  Route handlers for webhooks and non-UI clients
  modules/                Domain layer: the modular-monolith seam
    catalog/
      index.ts            PUBLIC ENTRY POINT — the module's only export
      domain/             Pure business rules; no I/O, no framework, no config
      application/        Use cases and the ports they depend on
      infrastructure/     Port implementations: Prisma repositories, adapters
    cart/
    orders/
    payments/
    delivery/
    identity/
    media/
    pricing/
    inventory/
    audit/
  ui/                     Design system: tokens and domain-agnostic primitives
    tokens.css            Type, spacing, colour, radii, motion — every token
    base.css              Element reset and the single global focus style
    index.ts              PUBLIC ENTRY POINT for primitives
  lib/                    Cross-cutting infrastructure with no domain knowledge
    db.ts                 Database client and transaction helper
    config.ts             Validated environment configuration
    logger.ts             Structured logging
    errors.ts             Error taxonomy
    i18n/                 Locale resolution and message catalogues
prisma/
  schema.prisma           Single Prisma schema; models grouped by owning module
  migrations/             Generated SQL migrations, committed and reviewed
scripts/                  Operational scripts, run outside the application
tests/
  integration/            Cross-module tests against a real database
docs/
```

Path aliases are `@/app/*`, `@/modules/*`, `@/lib/*`, and `@/ui`. There is
deliberately no catch-all `@/*` alias: the explicit aliases are what make the
import restrictions in section 4 expressible.

`src/ui` is presentation only. It may be imported by `app/` and by feature
components, but it must not know what a bicycle, an order, or a price is —
ESLint forbids it from importing `@/modules/*` or `@/app/*`. Anything
domain-aware is a feature component and belongs with its module or in `app/`.

Nothing else belongs at the root of `modules/`. A new domain concept is either a
new module folder with the same shape, or it belongs inside an existing one.

## 3. Domain modules

Each module owns a slice of the business and the tables backing it.

| Module      | Owns                                                                          | Does not own                         |
| ----------- | ----------------------------------------------------------------------------- | ------------------------------------ |
| `catalog`   | Products, variants (frame size, colour), categories, specifications           | Prices shown to customers, stock     |
| `pricing`   | Price calculation, VAT presentation, discounts, currency formatting           | Product identity                     |
| `cart`      | Cart aggregate, line items, quantity rules                                    | Payment, stock decrement             |
| `orders`    | Order agreement, line-item snapshots, denormalized payment/fulfillment status | Payment execution, shipment tracking |
| `payments`  | Payment attempts, webhook events, refunds                                     | Order status semantics               |
| `delivery`  | Methods, zones, shipment assignment                                           | Order status semantics               |
| `identity`  | Users, sessions, roles, customer profiles, addresses, wishlists               | Order data                           |
| `media`     | Image upload, storage references, opaque keys                                 | Which product an image belongs to    |
| `inventory` | On-hand, reservations, movements (one item per variant)                       | Product identity, order status       |
| `audit`     | Append-only change history                                                    | Domain state itself                  |

`catalog` and `pricing` are deliberately separate: promotions, VAT display, and
currency rules change on a different schedule from the product catalogue, and
merging them tends to scatter price logic across product queries.

Customer profile, address book, and wishlist operations are application
services on `identity`. There is no `customers` or `wishlist` module folder.

### Module anatomy

A module is layered internally by how much each part is allowed to depend on:

```
infrastructure/  ->  application/  ->  domain/
```

- `domain/` depends on nothing. Entities, value objects, invariants, and state
  transitions live here and must be testable in milliseconds with no database.
  It may not import `lib/`, the framework, or its own sibling layers.
- `application/` defines the **ports** it needs — a repository, a payment
  provider, a clock — and implements use cases against them. Dependencies
  arrive as arguments, never as imports of concrete implementations. This is
  what keeps use cases unit-testable and callable from background jobs.
- `infrastructure/` implements those ports and is the only place a Prisma
  client, HTTP client, or third-party SDK may appear.

`index.ts` is the module's entire public surface. It re-exports the use cases
and domain types other modules may use, and nothing else.

```ts
// src/modules/catalog/index.ts
export { getProductBySlug, listProducts, reserveStock } from "./application/use-cases";
export type { Product, ProductVariant } from "./domain/product";
```

The three internal layers are never imported from outside the module. If
another module needs data behind them, the owning module adds a use case and
exports it from `index.ts`.

## 4. Dependency direction

Dependencies point in one direction only:

```
app/  ->  modules/  ->  lib/
```

The rules, each of which a reviewer can check mechanically:

1. `app/` may import from `modules/*` (public entry points only) and from `lib/`.
2. `modules/*` may import from `lib/` and from other modules' **public entry
   points** only.
3. `lib/` may not import from `app/` or `modules/`. It contains no domain
   knowledge; if something in `lib/` mentions a bicycle, an order, or a price, it
   is in the wrong place.
4. No module may import another module's internals.
   `import { x } from "@/modules/orders"` is permitted;
   `import { x } from "@/modules/orders/application/use-cases"` is not.
5. A module's `domain/` layer imports nothing outside itself — not `lib/`, not
   the framework, not its own `application/` or `infrastructure/`.
6. No import cycles between modules. If `orders` and `payments` each need the
   other, the dependency is inverted: `orders` defines an interface, `payments`
   is passed in.

Enforcement is not left to discipline. Rules 1–5 are implemented as
`no-restricted-imports` blocks in `eslint.config.mjs` and fail `pnpm lint`,
which CI runs on every pull request. A lint error from that rule is a design
error, not a style complaint. A boundary that CI does not check is a
suggestion.

Direction of concrete couplings: `cart` depends on `catalog` and `pricing`;
`orders` depends on `cart`, `catalog`, and `identity`; `payments` and `delivery`
depend on nothing but `lib/` and are consumed by `orders` through interfaces
`orders` defines.

## 5. Database boundary

One PostgreSQL database. One connection pool, created once in `lib/db.ts` and
imported nowhere but module repositories.

- **Table ownership is exclusive.** Every table has exactly one owning module,
  declared in a commented per-module section of `prisma/schema.prisma`. A
  repository may only read and write tables its own module owns. Because Prisma
  keeps all models in one file (ADR-0004), this ownership is enforced by review
  rather than by file location.
- **No cross-module joins.** If `orders` needs a product name, it calls
  `catalog`'s service. Yes, this costs a query that a join would avoid. That cost
  is the price of being able to change `catalog`'s schema without auditing the
  whole codebase, and it is the single rule most likely to be violated under
  deadline pressure.
- **Foreign keys across module boundaries are allowed** at the database level for
  referential integrity, but the referencing module still must not read the
  referenced table.
- **`app/` never touches the database.** No queries in route handlers, server
  components, or server actions. They call module services.
- **Transactions** spanning modules are coordinated by a caller that passes a
  transaction handle through service functions. Service signatures accept an
  optional transaction context so that checkout can reserve stock and create an
  order atomically.
- **Migrations** live in `prisma/migrations/`, are generated from the Prisma
  schema, committed to the repository, and reviewed like code. Partial unique
  indexes and check constraints that Prisma cannot express are part of those
  SQL files and must not be discarded on regenerate. No schema change is
  applied by hand to any environment, and migrations must be
  backward-compatible with the currently deployed application version.

## 6. API boundary

The application is server-rendered; most data reaches the browser through server
components. **Do not grow an ad-hoc REST surface.** External HTTP exists only
where something outside our rendering pipeline must call in, and those callers
share one contract: `docs/api.md` (ADR-0015).

| Surface           | Location              | Use for                                                  |
| ----------------- | --------------------- | -------------------------------------------------------- |
| Server components | `app/**/page.tsx`     | Reading data for rendering                               |
| Server actions    | `app/**/actions.ts`   | Mutations from our own UI                                |
| Route handlers    | `app/api/**/route.ts` | Health, payment webhooks, `/api/v1/*` for non-UI clients |

Rules for all three: every entry point validates its input with a schema
(Zod or equivalent) at the boundary and passes typed, validated data inward, so
domain services can assume well-formed input. Every entry point performs its own
authorization check — never rely on the caller having checked. Domain errors from
`lib/errors.ts` are mapped to HTTP status codes or UI state at this layer only;
internal error details and stack traces never reach the client.

Route Handlers additionally:

- wrap work in `withRoute` so the envelope, request id, logs, and error map
  are the same on every path;
- return DTOs, never service objects or spread domain entities;
- paginate, filter, and sort through the allow-lists in `src/lib/http`;
- resolve a `Principal` from `identity` and pass it into services.

## 7. Authentication and authorization boundary

`identity` owns users, credentials, sessions, roles, customer profiles,
addresses, and wishlists. Callers are `anonymous` or an authenticated
`customer` / `staff` principal. Staff job titles (`admin`, `manager`,
`inventory`, `order_management`) live on `user_staff_roles` (ADR-0017). Use
the helpers in `identity` — do not invent a second permission matrix.

- Session establishment and verification live in `identity`. No other module
  reads session cookies or tokens.
- **Authentication** (who is this) is resolved once per request at the `app/`
  boundary and passed inward as an explicit argument. Domain services never read
  ambient request state — a service that reaches for the current session cannot
  be tested or called from a background job.
- **Authorization** (may they do this) is enforced in two places, deliberately:
  route-level checks in `app/` (`withRoute` policies, including staff titles)
  and ownership checks inside services for anything user-scoped. A customer
  must not read another customer's order, address, wishlist, or profile. A
  service that loads an order by id must verify the principal; the URL is not
  a permission.
- Passwords, if used, are hashed with a modern memory-hard algorithm. Sessions
  are httpOnly, `Secure`, and `SameSite=Lax` cookies.
- The admin area is never exposed through the same navigation as the storefront
  and is excluded from search indexing.

## 8. Payment abstraction

Belarusian payment integration is unsettled (bePaid, WebPay, and ERIP are all
plausible and have different redirect and callback models), so `orders` must not
know which provider is in use.

`orders` defines the interface it needs; `payments` implements it:

```ts
// modules/payments/types.ts
export interface PaymentProvider {
  createPayment(input: {
    orderId: string;
    amountMinor: number; // integer minor units, never floats
    currency: "BYN";
    returnUrl: string;
  }): Promise<{ paymentId: string; redirectUrl: string }>;

  verifyWebhook(rawBody: string, headers: Headers): Promise<PaymentEvent>;
}
```

Constraints:

- Money is stored and passed as **integer minor units** (kopeks). Floating-point
  arithmetic on money is prohibited everywhere in the codebase.
- Provider-specific types, SDKs, and field names stay inside
  `modules/payments/providers/<name>.ts`. Nothing outside `payments` may name a
  provider.
- Payment state is authoritative only after webhook verification. A user
  returning to the success URL is a hint, not a confirmation; never mark an order
  paid from a browser redirect.
- Webhook handlers are **idempotent** and verify signatures before doing any
  work. Providers retry, and duplicate delivery must not double-fulfil an order.
- `payments` records its own transaction log; it does not write order rows. It
  reports events to `orders`, which decides what an event means for order status.
- A `MockPaymentProvider` exists from the first scaffold so that checkout can be
  built and tested before a provider is chosen.

## 9. Delivery abstraction

Same shape as payments, and for the same reason: courier, pickup point,
Belpochta, and in-store collection are not yet decided.

```ts
export interface DeliveryMethod {
  readonly code: string;
  quote(input: {
    destination: Destination;
    items: ParcelItem[];
  }): Promise<{ costMinor: number; estimatedDays: number } | null>;
}
```

- `delivery` owns shipping zones, regional cost rules, and pickup point data.
- A method returning `null` from `quote` means "unavailable for this
  destination", which is a normal outcome, not an error.
- `orders` stores the chosen method's `code` and the quoted cost **as captured at
  order time**. Quotes are never recomputed against a historical order; tariffs
  change and an order's recorded cost is a fact.
- Carrier API clients, if any, live inside `delivery`. No carrier SDK type
  appears in another module's signature.

## 10. Media storage abstraction

Product photography is the bulk of this store's content and must not be coupled
to a hosting provider or committed to the repository.

`media` exposes a narrow interface and hides whether the backend is the local
filesystem, S3-compatible object storage, or a CDN:

```ts
export interface MediaStore {
  put(file: Blob, opts: { contentType: string }): Promise<{ key: string }>;
  urlFor(key: string, variant?: "thumb" | "card" | "full"): string;
  delete(key: string): Promise<void>;
}
```

- Other modules store and pass **opaque keys**, never URLs. A key survives a
  change of storage backend; a URL does not.
- `catalog` owns the association between a product and its image keys; `media`
  owns the bytes and knows nothing about products.
- Uploads validate content type and size at the boundary, and derivative sizes
  are generated on upload or on first request rather than shipping full-
  resolution originals to the storefront.
- A local filesystem implementation is the development default so that no cloud
  credentials are needed to run the app.

## 11. Localization

The store is Russian-language for a Belarusian market. Whether Belarusian is
added is unresolved, so the architecture must make adding it cheap without
building an unused translation pipeline now.

- **No user-facing string is hardcoded in a component.** All copy comes from
  message catalogues in `lib/i18n/messages/<locale>.ts`. This is the one rule
  that, if broken early, makes a second locale prohibitively expensive later.
- `ru` is the only locale shipped initially and is the fallback.
- Routing ships **without** a locale path segment until a second locale is
  actually committed to. Adding `/[locale]/` later is a routing change; the
  expensive part — extracting strings — is handled by the rule above.
- Locale is resolved once in `lib/i18n` and passed down. Domain modules are
  locale-agnostic: services return codes and structured data, and `app/`
  translates them for display. An error from `orders` is a code, not a Russian
  sentence.
- Formatting of currency, dates, and numbers goes through `Intl` helpers in
  `lib/i18n`, never through string concatenation. Prices display in BYN.
- Product content that is genuinely translatable (names, descriptions) is
  modelled with a locale column from the first migration, even while only `ru`
  rows exist. Retrofitting this into a populated catalogue is painful.

## 12. Observability

Proportionate to one application and one database. **No tracing backend, metrics
pipeline, or log aggregation cluster is in scope.**

- **Structured JSON logging** through `lib/logger.ts` only; no bare `console.log`
  in committed code. Each log line carries a request id, and the user id where
  known.
- A request id is generated at the `app/` boundary and threaded through service
  calls so that one customer's failed checkout can be reconstructed from logs.
- **Never log** passwords, session tokens, payment card data, provider secrets,
  or full webhook bodies containing personal data.
- Log at the boundaries: one line per inbound request, one per outbound
  third-party call with its duration and outcome, one per domain error. Not one
  per function.
- `GET /api/health` reports application liveness and database connectivity, for
  the deployment platform to poll.
- Unhandled exceptions are captured by an error reporting service once one is
  chosen; until then they are logged with full context server-side and surfaced
  to the user as a generic message.

## 13. Testing strategy

Weighted toward the layers where ecommerce bugs actually cost money.

| Layer       | Tool                   | Covers                                                                                     | Speed                |
| ----------- | ---------------------- | ------------------------------------------------------------------------------------------ | -------------------- |
| Unit        | Vitest                 | Pricing arithmetic, VAT, delivery cost rules, order state transitions, cart quantity rules | Milliseconds, no I/O |
| Integration | Vitest + real Postgres | Repositories and service use cases against actual SQL, including transaction rollback      | Seconds              |
| End-to-end  | Playwright             | Browse, add to cart, checkout with the mock payment provider                               | Slowest; few of them |

Rules:

- **Pure domain logic is unit-tested with no database.** Money and state-machine
  code must be exercisable in milliseconds, which is another reason services
  take dependencies as arguments rather than reaching for global state.
- **Repositories are integration-tested against real PostgreSQL**, never a mock
  or SQLite substitute. A repository test that does not run SQL tests nothing.
  Each test runs in a transaction that is rolled back.
- Third-party providers are exercised through the interfaces in sections 8–10
  using mock implementations. We never call a live payment provider in a test.
- Every bug fix lands with a test that fails without the fix.
- CI runs lint, typecheck, unit, and integration on every pull request.
  End-to-end tests run against a built application.
- Note the standing constraint from `docs/BASELINE.md`: the audit machine has
  neither Docker nor PostgreSQL installed, so the integration tier cannot run
  until a database is provisioned. Resolving that is a prerequisite for
  trustworthy data-layer work, not an afterthought.

## 14. Security rules

- **All input is validated at the boundary** with a schema before reaching a
  domain service. Server actions are public HTTP endpoints and receive exactly
  the same scrutiny as route handlers.
- **All database access is parameterised** through the ORM's query builder. Raw
  SQL string interpolation with user input is prohibited.
- **Authorization is checked on every request**, including ownership checks
  inside services, as specified in section 7. Never trust an id from a URL,
  a form field, or a hidden input.
- **Secrets come only from validated environment variables** through
  `lib/config.ts`, which fails fast at startup if a required variable is missing.
  No secret is committed, and `.env.example` lists names with empty values.
- **Prices and stock are recomputed server-side at checkout.** A cart submitted
  from the browser is a list of product ids and quantities, never prices. This
  is the most commonly exploited weakness in small ecommerce builds.
- **Webhooks verify provider signatures** before any processing, and are
  idempotent.
- **Mutations are CSRF-protected**, cookies are httpOnly/Secure/SameSite, and
  security headers including a Content-Security-Policy are set at the edge.
- **Personal data is minimised.** Store what fulfilment requires. Card data is
  never stored or logged; it is handled by the provider.
- Rate-limit authentication attempts and checkout submission.
- Dependency updates are reviewed; the baseline audit notes that `prisma`'s
  `latest` npm tag currently resolves to a release candidate, so versions are
  pinned and prereleases are not adopted accidentally.

## 15. Deployment model

**One application, one database, one deployment unit.** No queue, no worker
fleet, no cache tier until a measured problem demands one.

- The application is built as a single Next.js production build and deployed as
  one unit to a single hosting target. The specific platform is unresolved (see
  section 16) and this contract deliberately avoids depending on any
  platform-specific primitive beyond standard Node.js hosting.
- Environments: local development, and production. A staging environment is
  added when there is something to stage; two environments that drift are worse
  than one.
- **Migrations run as an explicit step before the new application version
  receives traffic**, and must be backward-compatible with the outgoing version
  so that a rollback does not strand the schema.
- Configuration is entirely environment variables, validated at startup by
  `lib/config.ts`. The same build artifact runs in any environment.
- CI runs install, lint, typecheck, build, unit, and integration on every pull
  request. Deployment happens from the main branch after those pass.
- Database backups are automated and restoration is tested at least once before
  the store accepts real orders. An untested backup is not a backup.
- Rollback is redeploying the previous build. This is only safe because of the
  migration rule above.

## 16. Unresolved decisions

Decisions already settled are recorded in `docs/adr/` and are **not** open for
reconsideration except under the conditions each ADR names: the modular monolith
(ADR-0001), Next.js App Router (ADR-0002), PostgreSQL (ADR-0003), Prisma pinned
to stable 7.10.0 (ADR-0004), the provider-neutral payment abstraction
(ADR-0005), manual-first delivery (ADR-0006), object storage for media
(ADR-0007), the testing strategy (ADR-0008), Russian-first localization
(ADR-0009), BYN as integer minor units (ADR-0010), CSS Modules with design
tokens for styling (ADR-0011), the first catalogue schema with per-variant
stock grain and no EAV (ADR-0012), independent order/payment/fulfillment
statuses (ADR-0013), the race-safe inventory ledger (ADR-0014), Route
Handler HTTP conventions (ADR-0015), and customer authentication with Argon2id
plus hashed httpOnly sessions (ADR-0016). Availability vocabulary is in
`docs/inventory.md`; the HTTP envelope is in `docs/api.md`.

What remains open. Each names who must decide and what it blocks; none should be
silently settled by whoever writes the first line of relevant code.

1. **Payment provider: bePaid, WebPay, or ERIP.** Business decision, requires a
   merchant account. Blocks real checkout but not its construction, because of
   the mock provider in section 8 and ADR-0005.
2. **Delivery rate table contents and the eventual carrier.** Business decision.
   ADR-0006 settles the manual-first approach; the actual zones, rates, and
   which carrier is used are still to be supplied by the business.
3. **Hosting target and managed PostgreSQL provider.** Blocks section 15's
   specifics and the local development database that section 13's integration
   tier depends on. This is the highest-priority unblock: ADR-0008's integration
   tier cannot run without it.
4. **Object storage provider and credentials.** Blocks production media under
   ADR-0007; the filesystem implementation covers development meanwhile.
5. **Admin scope: custom admin area or an off-the-shelf CMS.** Determines
   whether `app/admin/` is built out at all. Note that ADR-0006's manual-first
   delivery assumes staff have somewhere to record tracking references.
6. **VAT and currency presentation.** Business decision. Blocks `pricing`.
   ADR-0010 fixes the representation; how VAT is displayed and whether a second
   currency is shown are not settled.
7. **Whether Belarusian is added as a second locale.** Business decision.
   ADR-0009 ships Russian-only and defers the routing segment; this answer
   activates that deferred work.

Amending this document is expected as these resolve. Amend it in the pull
request that makes the change, and record the decision as a new ADR.
