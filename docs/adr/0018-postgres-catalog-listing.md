# ADR-0018: Catalogue listing stays in PostgreSQL

- Status: Accepted
- Date: 2026-09-12
- Confirms: [ADR-0003](0003-postgresql.md) (no second search engine)
- Amends: [ADR-0012](0012-first-catalogue-schema.md) — groupset, material,
  bicycle type, and wheel size are now typed columns because listing needs them

## Context

Discovery needs category, brand, bicycle type, frame size, wheel size, price,
availability, and a few specifications, with pagination and sort. A search
cluster would filter those faster at large scale and would also be a second
system to operate.

## Decision

1. **Do not introduce Elasticsearch** (or Meilisearch, Typesense, …).
2. **Filter, sort, and paginate in PostgreSQL** via the catalog repository.
   Unknown query keys stay rejected at the HTTP allow-list.
3. **Availability is not a catalog join.** Inventory returns in-stock variant
   ids; catalog applies `product_variants.id IN (…)`.
4. **New product facts are columns** (`bicycle_type`, `wheel_size`,
   `frame_material`, `groupset`, `brake_type`), not an EAV table.

`q` is `ILIKE` on name (and brand name). Full-text search can be added later
as a Postgres `tsvector` without leaving the database.

## When to revisit

If listing latency on a realistic catalogue is dominated by `ILIKE` or by
very wide OR-filters, add Postgres FTS or a materialized facet table first.
A separate search engine is only in play after that is proven insufficient.
