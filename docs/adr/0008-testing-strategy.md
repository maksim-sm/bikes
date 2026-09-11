# ADR-0008: Testing strategy

- Status: Accepted
- Date: 2026-09-11

## Context

Ecommerce defects are asymmetric: a rendering glitch is embarrassing, while a
pricing, stock, or payment-state defect costs money or oversells inventory
directly. The team is small, so total test-suite runtime is a real constraint on
how often tests get run.

## Decision

Three tiers, weighted toward where defects are expensive.

| Tier        | Tool                     | Covers                                                                                        |
| ----------- | ------------------------ | --------------------------------------------------------------------------------------------- |
| Unit        | Vitest                   | Pricing and VAT arithmetic, delivery rate rules, order state transitions, cart quantity rules |
| Integration | Vitest + real PostgreSQL | Repositories and service use cases against actual SQL, including transaction behaviour        |
| End-to-end  | Playwright               | Browse, add to cart, checkout against the mock payment provider                               |

Binding rules:

1. **Pure domain logic is unit-tested with no I/O.** Money and state-machine
   code must run in milliseconds. This is part of why services take their
   dependencies as arguments rather than reaching for ambient state.
2. **Repositories are integration-tested against real PostgreSQL** — never a
   mock, and never SQLite. A repository test that does not execute SQL against
   the real engine tests nothing about the thing most likely to be wrong. Each
   test runs in a transaction that is rolled back.
3. **Third-party providers are exercised only through the interfaces in
   ADR-0005, ADR-0006, and ADR-0007**, using mock implementations. No test calls
   a live payment provider.
4. **Every bug fix lands with a test that fails without the fix.**
5. CI runs lint, typecheck, unit, and integration on every pull request;
   end-to-end runs against a built application.

## Alternatives considered

**Heavy end-to-end coverage, few unit tests.** Rejected: slow, flaky, and it
localises failures poorly. A broken VAT calculation should fail in a
ten-millisecond test naming the rule, not in a five-minute browser run that says
checkout is broken.

**Mock the database in repository tests.** Rejected as the most common
self-deception in this area. Mocking the database means asserting that the code
calls the ORM the way the test expects, which is a tautology; it cannot catch a
wrong join, a missing index, a constraint violation, or a transaction that does
not isolate.

**SQLite as a test substitute for PostgreSQL.** Tempting because it removes the
infrastructure requirement. Rejected: different type affinity, different
constraint enforcement, different concurrency semantics, and no support for
PostgreSQL-specific features we intend to use. It trades real coverage for
convenience and produces green tests against untested SQL.

**100% coverage targets.** Rejected: it rewards testing trivial code and says
nothing about whether the expensive paths are covered.

**No tests until after launch.** Rejected: stock and payment defects are
discovered by customers, expensively.

## Reasons

- Test effort follows the cost of failure, which in ecommerce is concentrated in
  arithmetic and state transitions.
- Fast unit tests get run; slow suites get skipped, which is a property of
  people rather than tooling.
- Real-database integration tests are the only tier that can validate the
  no-cross-module-joins boundary and the atomic checkout transaction, which are
  the load-bearing claims of ADR-0001 and ADR-0003.
- Mock providers make full checkout testable with no credentials and no network,
  which is what makes ADR-0005's abstraction pay for itself.

## Consequences

- **Integration tests require a running PostgreSQL, and the baseline audit found
  neither PostgreSQL nor Docker installed.** Until a database is provisioned,
  this tier cannot run, and data-layer work cannot be trusted. This is the most
  concrete infrastructure prerequisite in the project.
- CI is slower and more complex than a unit-only pipeline, and needs a database
  service.
- End-to-end tests will occasionally be flaky and need an owner, or they will be
  ignored and then deleted.
- Mock providers can drift from real provider behaviour; the first real payment
  integration must correct the mock rather than just add to it.

## When to revisit

- Total CI runtime grows enough to discourage running tests, at which point the
  tiers get rebalanced rather than removed.
- Production defects cluster in a layer this weighting under-tests, which is
  evidence to reweight.
- A test-database strategy emerges that is materially faster while still running
  real PostgreSQL — for example template databases or parallel schemas. This
  changes the mechanism, not rule 2.
