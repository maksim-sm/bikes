# ADR-0003: PostgreSQL as the single datastore

- Status: Accepted
- Date: 2026-09-11

## Context

The data is relational and correctness-critical: products, variants, stock
levels, carts, orders, payments, and users, with checkout requiring an atomic
reservation of stock alongside order creation. Under ADR-0001 there is exactly
one application and one database, and modules own tables within it.

## Decision

Use **PostgreSQL** as the single datastore for all modules. No second database,
no separate search engine, and no cache tier until a measured problem justifies
one.

Every table is owned by exactly one module. Foreign keys across module
boundaries are permitted for referential integrity, but a module still reads
only its own tables.

## Alternatives considered

**MySQL / MariaDB.** Perfectly capable of this workload. Rejected on
PostgreSQL's stronger support for the things this catalogue will plausibly need:
richer JSON handling for product specifications, full-text search with
Russian-language stemming built in, and better constraint expressiveness.

**SQLite.** Attractive operationally for a small store, and fine for reads.
Rejected because concurrent writes during checkout are exactly its weak point,
and because hosting it reliably conflicts with the stateless-deployment model.
It is also unsuitable as a test substitute (see ADR-0008).

**MongoDB or another document store.** Rejected: orders and stock are the
canonical case for transactional relational integrity. Modelling them as
documents means reimplementing joins and constraints in application code.

**PostgreSQL plus Elasticsearch for catalogue search.** Rejected as speculative
infrastructure. PostgreSQL's full-text search with a Russian configuration is
sufficient for a single retailer's catalogue, and adding a second system means
a second thing to run, back up, and keep in sync.

## Reasons

- Atomic multi-table transactions are a hard requirement at checkout and are
  native here.
- Russian-language full-text search is available in-database, which matters for
  a Russian-language storefront and removes a whole component from the
  architecture.
- Integer and numeric types support the money representation in ADR-0010
  exactly, with no floating-point risk.
- Managed PostgreSQL is available from every plausible hosting provider, which
  keeps the still-open hosting decision unconstrained.
- Mature migration tooling, which the deployment model depends on.

## Consequences

- One database is a single point of failure. Automated backups and a **tested**
  restore are required before the store accepts real orders; an untested backup
  is not a backup.
- Schema changes are shared infrastructure even though tables are module-owned.
  Migrations must be reviewed with cross-module impact in mind and must be
  backward-compatible with the deployed application version so rollback stays
  safe.
- Connection pooling must be configured deliberately, particularly if the
  eventual hosting platform is serverless.
- Local development and integration testing require a running PostgreSQL. The
  baseline audit found neither PostgreSQL nor Docker installed on the
  development machine, so provisioning one is a prerequisite for data-layer
  work, not an afterthought.

## When to revisit

- Catalogue search quality measurably outgrows PostgreSQL full-text search, with
  evidence from real queries rather than anticipation.
- Read load requires replicas and the application needs explicit read/write
  splitting.
- A specific module needs a datastore with genuinely different semantics, at
  which point it is a candidate for extraction under ADR-0001's revisit
  conditions.
