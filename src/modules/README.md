# Domain modules

Each folder here is one domain module as defined in `docs/architecture.md`.
Modules own their tables exclusively, expose a single public entry point, and
never reach into each other's internals.

## Internal layering

Within a module, code is separated by how much it is allowed to depend on:

```
modules/<name>/
  index.ts            PUBLIC ENTRY POINT — the only file other modules may import
  domain/             Pure business rules. No I/O, no framework, no config.
  application/        Use cases. Orchestrates domain logic and calls ports.
  infrastructure/     Implementations of ports: Prisma repositories, provider adapters.
```

The dependency direction inside a module mirrors the one between layers:

```
infrastructure/  ->  application/  ->  domain/
```

- `domain/` depends on nothing. Entities, value objects, invariants, and state
  transitions live here, and they must be testable in milliseconds with no
  database. ESLint enforces that this directory imports neither `@/lib/*` nor
  the module's own `application/` or `infrastructure/`.
- `application/` defines the **ports** (interfaces) it needs — a repository, a
  payment provider, a clock — and implements use cases against them. It
  receives its dependencies as arguments rather than importing concrete
  implementations, which is what keeps use cases unit-testable and callable
  from background jobs.
- `infrastructure/` implements those ports. It is the only place a Prisma
  client, an HTTP client, or a third-party SDK may appear.
- `index.ts` re-exports the use cases and domain types other modules may use,
  and nothing else. Everything below it is internal.

## Adding a module

Create the folder, add `index.ts`, and add the layers you actually need — a
module with no external dependencies does not need an `infrastructure/`
directory yet. Do not create a module for something that is a concept inside an
existing one.

## Current modules

Application services live in each module's `application/` folder and are
exported from `index.ts`. They take repository and clock ports as arguments so
unit tests (and later Prisma repositories) can supply them. `app/` and `src/ui`
must not import Prisma or `@/lib/db`.

Customers and wishlist are not their own modules: they are services on
`identity`, which owns those tables.

| Module      | Owns                                                   |
| ----------- | ------------------------------------------------------ |
| `catalog`   | Products, variants, categories, specifications         |
| `pricing`   | Price calculation, VAT, discounts, currency rules      |
| `cart`      | Cart aggregate, line items, quantity rules             |
| `orders`    | Order lifecycle, snapshots, status transitions         |
| `payments`  | Payment attempts, events, refunds                      |
| `delivery`  | Methods, zones, shipment assignment                    |
| `identity`  | Users, sessions, roles, profiles, addresses, wishlists |
| `media`     | Image storage abstraction                              |
| `inventory` | On-hand, reservations, movements (per variant)         |
| `audit`     | Append-only change history (actor + request context)   |
