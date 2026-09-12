# ADR-0024: Payment failure releases inventory holds once

- Status: Accepted
- Date: 2026-09-12
- Amends: [ADR-0014](0014-race-safe-inventory.md),
  [ADR-0023](0023-server-authoritative-payment-state.md)

## Context

Checkout reserves stock against the order (ADR-0021). Payment can then fail,
time out, or be abandoned while the customer is on a provider page. The
reservation worker already expires due ACTIVE rows. Payment events only
updated `orders.payment_status`. A failed payment left `reserved` high until
the hold expired — or a naive double-release (webhook + expire + cancel)
could try to decrement twice.

## Decision

These outcomes **release** every ACTIVE hold for the order:

- payment `FAILED` (declined webhook or poll)
- payment `EXPIRED` (local `expiresAt`, provider timeout, or abandoned
  checkout after the reservation expired)
- payment `CANCELLED` (customer or `cancelOrder`)
- reservation `expireDue` (existing worker)

`cancelForOrder` ignores holds that are no longer ACTIVE. Webhook replay,
`expireDue`, and cancel can all run; `reserved` decreases once.

A later `startPayment` is a **retry**. The `created` event re-reserves the
order lines when the order is still `PLACED` and has no ACTIVE hold. If
stock is gone, the retry fails with insufficient available inventory.

`createCheckoutHoldReconciler` is the sweep: expire timed-out payments,
expire due reservations, then expire leftover unpaid attempts for those
orders.

Paid / authorized holds are extended (`confirmForOrder`) so a successful
payment is not freed by the 15-minute unpaid timer.

## Alternatives considered

**Wait only for reservation expiry.** Rejected: a declined card would pin
stock for the full hold window.

**Release from the payment module.** Rejected: `payments` does not write
inventory or order rows (ADR-0005). It reports events; `orders` decides.

**Cancel the order on every failed payment.** Rejected: retry is a new
attempt on the same `PLACED` order.

## Reasons

- Inventory leaks are oversell or stuck `reserved`. Both are worse than an
  extra event handler.
- "Exactly once" is the reservation status machine: only ACTIVE rows change
  counters.

## Consequences

- Payment attempts store `expiresAt` (15 minutes, same as an unpaid hold).
- Compose wires `applyEvent` to `applyPaymentEvent` so a webhook actually
  frees stock.
- A worker (or any caller) must run the reconciler; expiry is not
  implicit without that call or a poll.

## When to revisit

- Auth-then-capture needs a longer authorized hold than 30 days.
- Cart-level holds (no order yet) need the same release rules.
