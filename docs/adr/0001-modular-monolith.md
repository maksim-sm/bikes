# ADR-0001: Modular monolith, not microservices

- Status: Accepted
- Date: 2026-09-11

## Context

A new Belarus-focused, Russian-language bicycle ecommerce store, built from an
empty repository by a very small team. The system has one transactional core:
checkout must reserve stock and create an order atomically. Traffic is a
regional bicycle retailer's, not a marketplace's.

## Decision

Build a **modular monolith**: one deployable application and one database, with
domain modules under `modules/` that own their tables exclusively and expose a
single public entry point each. Cross-module access goes through those entry
points; cross-module database joins and deep imports are prohibited and enforced
by lint in CI.

## Alternatives considered

**Microservices.** Independent deployables per domain, communicating over the
network. Rejected: it converts an in-process function call into a network
partition and an atomic transaction into a distributed saga. Our hardest
requirement — atomic stock reservation at checkout — becomes the hardest thing
to implement. The team does not have the operational capacity to run and debug
several services, and nothing in the workload needs independent scaling.

**A conventional layered monolith** (`controllers/`, `services/`, `models/`).
Rejected: layering by technical role means one feature touches every folder and
nothing owns anything. Coupling accumulates invisibly because there is no
boundary to violate. The failure mode is the well-documented one where every
query can reach every table and schema changes become repository-wide audits.

**Serverless functions per endpoint.** Rejected: fragments domain logic across
deployment units with no shared structure, and shifts the same boundary problem
into infrastructure configuration while adding cold-start and connection-pooling
problems against PostgreSQL.

## Reasons

- The single-transaction checkout requirement is satisfied natively by one
  database and in-process calls.
- Boundaries are the part worth keeping from service-oriented design; the
  network hop is the part that costs us. A modular monolith takes the first
  without the second.
- Enforced module boundaries preserve the option to extract a service later. An
  unstructured monolith does not. We are buying that option cheaply rather than
  paying for it now.
- One deployment unit, one log stream, one database to back up, which matches
  the operational capacity actually available.

## Consequences

- Cross-module reads cost an extra service call where a SQL join would have been
  cheaper. This is a real, accepted cost, and it is the rule most likely to be
  violated under deadline pressure — hence lint enforcement rather than
  convention.
- Module boundaries must be policed in review; a boundary CI does not check
  degrades into a suggestion within weeks.
- The whole application scales as a unit. A traffic spike on the catalogue
  scales the admin area too. At this size that is irrelevant.
- A deployment ships everything, so a bug anywhere can block an unrelated
  release. Mitigated by the testing strategy in ADR-0008.

## When to revisit

- A specific module develops a genuinely different scaling or availability
  profile, evidenced by production metrics rather than anticipation.
- The team grows past the point where a single deployment pipeline causes
  repeated release contention between independent workstreams.
- A module needs a runtime or datastore that cannot live in this application.

Growth in codebase size alone is not a reason. Neither is a desire to try
microservices.
