# Inventory vocabulary and invariants

Status: authoritative for stock counters. Schema: `inventory_items`,
`inventory_reservations`, `inventory_movements`. Decision: ADR-0014.
Module: `src/modules/inventory/`.

Stock is counted per **product variant** (SKU: frame size × colour). There is
exactly one `inventory_items` row per variant. Application code inserts
reservations and receipts; it does not add or subtract `on_hand` / `reserved`
in process memory.

## Counters

### On-hand

Physical units in the warehouse. Increased by a **receipt** or a **return**.
Decreased by an **adjustment** (write-off, damage) or by **commit** (the unit
left for a customer). Never negative. Never lower than `reserved` (check
constraint and adjustment trigger).

### Reserved

Units promised to **ACTIVE** reservations and not yet committed or given back.
Increased only when an ACTIVE reservation row is inserted. Decreased by
**release**, **expiration**, or **commit**. Never negative. Never greater than
`on_hand`.

### Available

Units that can still be promised.

```
available = on_hand - reserved
```

This is a PostgreSQL `GENERATED ALWAYS AS (...) STORED` column. Clients read
it; they never write it. A reservation insert succeeds only if

```sql
UPDATE inventory_items
   SET reserved = reserved + :qty
 WHERE id = :item
   AND on_hand - reserved >= :qty
```

returns a row. Two concurrent checkouts lock that row; the second sees the
updated `reserved` and fails with `insufficient available inventory` rather
than both computing `1 - 0` in the application and both succeeding.

`src/modules/inventory/application/reservation-concurrency.integration.test.ts`
proves that against real PostgreSQL: two buyers, many buyers, expiry, payment
failure, cancellation, and a successful payment. Available never goes negative
and the number of successful reservations never exceeds `on_hand`.

Failed, expired, and cancelled payments call `cancelForOrder`. That path and
`expireDue` both refuse to decrement a hold that is no longer ACTIVE, so
`reserved` moves exactly once.

## Reservation lifecycle

A reservation starts **ACTIVE** and is terminal after one of the three
outcomes below. Quantity and inventory item cannot be edited in place; release
and insert a new row. Rows are never deleted.

### Expiration

Every ACTIVE reservation has `expires_at`. A worker (or any caller) runs
`expire_inventory_reservations(timestamptz)` (default `now()`). That statement
sets due ACTIVE rows to **EXPIRED**. The BEFORE UPDATE trigger then subtracts
their quantity from `reserved`, restoring availability. The function is safe
to call concurrently: each UPDATE row-locks the reservation, then the item.

The partial index `inventory_reservations_active_expires_at_idx` is how the
worker finds due rows without a sequential scan of committed history.

### Release

An explicit give-back while the hold is still ACTIVE (cart abandoned, quantity
changed, order cancelled before commit). `UPDATE ... SET status = 'RELEASED'`.
`released_at` is stamped by the BEFORE UPDATE trigger if the caller omitted
it. `reserved` decreases; `on_hand` is unchanged.

### Commit

The sale happened: the reserved units leave the warehouse.
`UPDATE ... SET status = 'COMMITTED'`. `committed_at` is stamped the same way.
Both `reserved` and `on_hand` decrease by the reserved quantity. `available`
is unchanged (the units were already unavailable).

## Operations

`createInventoryServices` is the only write API. Each call is one unit of
work; production persists through reservation rows or movement inserts so the
triggers stay the serialisation point.

| Service          | Effect                                                       | Ledger row                      |
| ---------------- | ------------------------------------------------------------ | ------------------------------- |
| `receiveStock`   | Supplier arrival. `on_hand` increases. Staff only.           | `RECEIPT` (app insert)          |
| `adjustStock`    | Write-off / damage. `on_hand` decreases, not below reserved. | `ADJUSTMENT` (app insert)       |
| `returnStock`    | Sold unit comes back. `on_hand` increases. Staff only.       | `RETURN` (app insert)           |
| `reserve`        | Promise units to a cart or order. Fails if `available < n`.  | `RESERVE` (reservation trigger) |
| `release`        | Give an ACTIVE hold back.                                    | `RELEASE` (reservation trigger) |
| `cancel`         | Same counter path as release (order cancelled before sale).  | `RELEASE` (reservation trigger) |
| `cancelForOrder` | Release every ACTIVE hold for that order.                    | `RELEASE` per hold              |
| `commit`         | Sale left the warehouse. `on_hand` and `reserved` decrease.  | `COMMIT` (reservation trigger)  |
| `commitForOrder` | Commit every ACTIVE hold for that order.                     | `COMMIT` per hold               |
| `expireDue`      | Worker: ACTIVE rows past `expires_at` become EXPIRED.        | `EXPIRE` (reservation trigger)  |

`listMovements(variantId)` reads the append-only ledger.

## Movements

`inventory_movements` is append-only. Application code may insert **RECEIPT**,
**ADJUSTMENT**, and **RETURN** only. **RESERVE**, **RELEASE**, **EXPIRE**, and
**COMMIT** are written by the reservation AFTER trigger so the ledger matches
the counters. Each row stores `on_hand_after` and `reserved_after`.

## What application code must not do

- `UPDATE inventory_items SET reserved = reserved + 1` from the client, or
  read `available`, add in JavaScript, and write the sum back.
- Delete reservation or movement rows.
- Insert a reservation that is not ACTIVE.
- Insert a RESERVE/RELEASE/EXPIRE/COMMIT movement by hand.
- Call `saveItem` / add `on_hand` in process memory for a receipt, return, or
  adjustment. Insert the movement row instead.

Insert an ACTIVE reservation (or UPDATE its status) inside the same database
transaction as the cart/order change that required it. The trigger is the
serialisation point.
