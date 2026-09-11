# ADR-0014: Race-safe inventory ledger

- Status: Accepted
- Date: 2026-09-11
- Partially supersedes: ADR-0012 (stock **location** only)

## Context

ADR-0012 put a non-negative `stock_qty` integer on `product_variants`. That
chose the right **grain** (per variant, not per product) but the wrong
**mechanism**: a single mutable column updated by application arithmetic.

Two checkouts that both read `stock_qty = 1` and both write `0` oversell. A
cart that holds a bicycle for fifteen minutes is indistinguishable from a
completed sale. There is no ledger of how the number moved, and no way to
expire a hold without inventing a second column in the application.

Checkout in this store must reserve stock in the same PostgreSQL transaction
as order creation (architecture contract). The database, not Node, has to be
the serialisation point.

## Decision

1. **Stock lives in `inventory`, not `catalog`.** One `inventory_items` row
   per variant (`UNIQUE (product_variant_id)`). New variants get a zero row
   from an AFTER INSERT trigger on `product_variants`. `stock_qty` is dropped.
2. **Three counters:** `on_hand`, `reserved`, and generated
   `available = on_hand - reserved`, with `on_hand >= 0`, `reserved >= 0`,
   `reserved <= on_hand`. Definitions are in `docs/inventory.md`.
3. **Reservations are rows**, not a number the app maintains. Status is
   ACTIVE → COMMITTED | RELEASED | EXPIRED. `expires_at` is required on
   insert. Quantity and item cannot change in place.
4. **A BEFORE INSERT/UPDATE trigger** applies the counter change with
   `UPDATE inventory_items SET reserved = reserved + n WHERE on_hand - reserved >= n`
   (and the matching release/expire/commit statements). If the WHERE misses,
   the statement fails. Concurrent reservations lock the same item row.
5. **An AFTER INSERT/UPDATE trigger** appends the movement. Movements are
   append-only; application code may insert RECEIPT and ADJUSTMENT only.
6. **`expire_inventory_reservations(timestamptz)`** bulk-expires due ACTIVE
   rows. Partial unique indexes keep one ACTIVE hold per cart item and per
   order item; a partial index on `expires_at WHERE status = 'ACTIVE'` serves
   the worker.

Per-variant grain and the prohibition on EAV from ADR-0012 stand.

## Alternatives considered

**Keep `stock_qty` and `SELECT … FOR UPDATE` in the repository.** Rejected:
every caller must remember the lock, there is still no reservation or expiry,
and a missed `FOR UPDATE` oversells. The trigger fails closed.

**Serializable transactions without a reserved counter.** Rejected: retries
on serialisation failure become checkout UX, and holds that span a cart
session are not a single transaction.

**A queue or Redis lock around stock.** Rejected under ADR-0001 / ADR-0003:
the lock would sit beside the source of truth.

**Application-only arithmetic with an optimistic `version` column.** Rejected:
the loser retries, but two winners that both passed a stale read still need
the same WHERE clause this trigger already uses. Put that WHERE in one place.

## Reasons

- Oversell is a database race, so the fix belongs in the statement that
  mutates the counter.
- Generated `available` cannot drift from `on_hand - reserved`.
- A reservation row is what cart and order can point at; a naked integer
  cannot expire, release, or commit.
- The movement ledger is how a human reconstructs why `on_hand` is 4.

## Consequences

- Catalog queries that used to read `product_variants.stock_qty` must join
  or call `inventory`. Cross-module joins remain forbidden in application
  SQL; the catalog service asks inventory for availability.
- `expire_inventory_reservations` must be scheduled before checkout is live.
  Until then, expired ACTIVE rows still occupy `reserved`.
- Accessories without a frame size still need a later variant-shape change
  (ADR-0012); this ADR does not add warehouses or inbound POs.

## When to revisit

- A second warehouse or inbound purchase-order reservations are required.
- Holds must nest (e.g. a supplier allocation plus a customer reservation).
- The expiry worker cannot keep up and a different expiry design is needed.

Finding application arithmetic more convenient is not a trigger.
