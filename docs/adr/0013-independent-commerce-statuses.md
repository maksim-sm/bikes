# ADR-0013: Independent order, payment, and fulfillment statuses

- Status: Accepted (amended by [ADR-0023](0023-server-authoritative-payment-state.md))
- Date: 2026-09-11

## Context

A bicycle order can fail to take payment, then succeed on retry, then be
cancelled and refunded, then still need a record of the shipment that never
went out. Folding those into one status field — the usual `pending / paid /
shipped / cancelled` enum — makes several of those combinations inexpressible.
The first commerce migration has to choose whether to keep them separate.

Historical accuracy matters as much as the current status. Catalogue prices,
the customer's address book, and delivery tariffs all change; an order must
still show what was agreed at checkout (ADR-0006, ADR-0010).

## Decision

1. **Three statuses, three owners of truth.**
   - `orders.status` (`PLACED | CANCELLED | COMPLETED`) is the commercial
     agreement.
   - `payments.status` is the source of truth for money movement. A copy lives
     on `orders.payment_status` so lists can filter without joining; the
     **orders** module writes that copy from payment events. The payments
     module does not write order rows (ADR-0005).
   - `orders.fulfillment_status` is the projection; `deliveries.status` is the
     assignment record. No delivery row means `UNFULFILLED`.
2. **Failed payments are rows, not overwritten flags.** A declined attempt
   stays `FAILED` with a `failure_code`. A retry is a new `payments` row. At
   most one `PENDING` payment per order (partial unique index).
3. **Refunds are their own table**, pointing at the payment they reverse. The
   order's `payment_status` becomes `REFUNDED` or `PARTIALLY_REFUNDED` when the
   orders module handles the event. Cancelling an order does not imply a
   refund; a captured payment on a cancelled order is a real, representable
   state that staff must resolve.
4. **Snapshots are columns, plus one JSON document.** Each `order_items` row
   freezes sku, names, size, colour, and the unit price in kopeks. The order
   freezes customer identity, shipping address, delivery method code/name, and
   quoted cost. `placed_snapshot` is the verbatim document. Neither is a live
   join to the catalogue or the address book.
5. **Audit logs are append-only and polymorphic** (`entity_type` + `entity_id`).
   They are owned by a small `audit` module. Payment webhook payloads are **not**
   audit logs; they go to `payment_events` with an idempotency key
   `(provider, provider_event_id)` and must not store raw bodies with PII.

## Alternatives considered

**A single `OrderStatus` that includes `PAID`, `SHIPPED`, `REFUNDED`.**
Rejected: a cancelled order with a captured payment and no shipment cannot be
named, and every new combination requires a new enum value.

**Keeping payment status only on `payments` and joining for every admin list.**
Rejected as a listing cost we would immediately denormalize. The copy is
explicit and written by `orders`, not a secret cache.

**Order lines as FKs to `product_variants` only, no snapshot columns.**
Rejected: renaming a bicycle or changing its price would rewrite history.

**JSON-only snapshots.** Rejected: "how many size M Émondas did we sell" should
be a query, not a JSON unpack.

**Deleting payment rows on retry.** Rejected: the failed attempt is the thing
support needs when a customer says they were charged.

## Reasons

- The combinations the store will actually hit — failed then succeeded
  payment, cancelled-but-paid, paid-but-unfulfilled — are all rows in this
  shape, not enum fiction.
- Snapshot columns survive catalogue edits and address-book edits, which is
  the requirement in ADR-0006 for delivery cost and ADR-0010 for money.
- Idempotent `payment_events` are how webhook retries do not double-fulfil
  (ADR-0005).
- A dedicated audit table keeps "who cancelled this" out of the order row and
  out of application logs.

## Consequences

- Application code must keep `orders.payment_status` and
  `orders.fulfillment_status` in step with the tables they project. A bug
  there is a stale list, not a lost payment — the payments and deliveries
  tables remain authoritative.
- `orders.delivery_method_code` is a foreign key, so a method used on a
  historical order cannot be deleted, only deactivated.
- Guest orders are allowed (`user_id` nullable); the customer snapshot columns
  still identify the buyer.
- At most one delivery row per order. Reassignment updates that row; prior
  values belong in `audit_logs`.

## When to revisit

- Multiple concurrent shipments per order (split fulfillment) become a real
  need, which would drop the unique constraint on `deliveries.order_id`.
- A second currency or a payment that captures in several steps (auth then
  capture) requires a richer payment state machine.
- Audit volume makes the JSON `before`/`after` columns too large, at which
  point the payload shape is narrowed, not the table removed.

Wanting a single status badge in the admin UI is not a trigger; that badge is
a view over three fields.
