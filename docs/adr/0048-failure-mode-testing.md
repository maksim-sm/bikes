# ADR-0048: Failure-mode testing

- Status: Accepted
- Date: 2026-09-13
- Amends: [ADR-0008](0008-testing-strategy.md), [ADR-0038](0038-isolated-postgres-integration-tests.md)

## Context

ADR-0008 weights tests toward money, stock, and payment state. Prompt 29.1
asks the store to be tested under realistic failures: provider timeouts,
duplicate and delayed webhooks, deadlocks, email and object-storage
outages, double-click checkout, last-unit races, browser-closed payment,
cancel-during-pay, and a repeated refund. Each path must have one
deterministic outcome — not "usually works".

## Decision

1. **`docs/failure-modes.md` is the contract.** Every listed scenario
   names the outcome and the test that proves it.
2. **Checkout claims the cart** (`claimForCheckout`) under a row lock
   (PostgreSQL) or a per-cart queue (memory). A double submit cannot
   place two orders from the same lines.
3. **Deadlocks retry** through `withDeadlockRetry` on inventory writes
   and cart transactions. Tests inject `P2034` and force a real
   PostgreSQL deadlock.
4. **Provider timeouts** map to `UnavailableError`. No payment attempt
   is stored if `createPayment` never returns.
5. **Media** deletes the object if metadata persist fails after `put`.
6. Unit tests cover the matrix without I/O. Integration tests cover
   claim races, last-unit checkout, deadlock retry, webhook replay, and
   refund/cancel against `bikes_test`.

## Alternatives considered

**Only Playwright for these paths.** Rejected: timeouts, deadlocks, and
webhook delay are not reliable in a browser, and ADR-0008 already
forbids live providers.

**Idempotency key on `POST /checkout`.** Rejected for now: claiming the
cart is enough for a double click. A client key can be added later
without changing the outcomes in `docs/failure-modes.md`.

**Revive `EXPIRED` / `CANCELLED` when a late success webhook arrives.**
Rejected: the state machine is terminal (`docs/payments.md`). Staff
reconcile captured money from ops anomalies.

## Consequences

- Checkout restores claimed lines when reservation or validation fails.
- A late paid webhook after expire or cancel does not restock a hold.
- CI grows by one integration file; it stays sequential (ADR-0038).

## When to revisit

- A real provider requires `EXPIRED → SUCCEEDED` (some acquirers settle
  after the local window). That is a payments ADR, then this table.
- Checkout gains an HTTP idempotency key; amend the double-click row.
