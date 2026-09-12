# ADR-0030: Admin inventory operations

- Status: Accepted
- Date: 2026-09-12
- Amends: [ADR-0014](0014-race-safe-inventory.md),
  [ADR-0029](0029-admin-shell-authorization.md)

## Context

ADR-0014 put on-hand, reserved, and available in `inventory` with an
append-only movement ledger. ADR-0029 gave inventory staff a console home at
`/admin/inventory`, but the page was a placeholder: stock mutations stayed
service calls with no actor on the movement row and no historical view.

Staff need to see current / reserved / available, adjust stock with a reason,
and reconstruct who changed what.

## Decision

1. **Staff reads go through inventory services.** `listStock`, `getStaffStock`,
   `listStaffMovements`, and `listRecentMovements` require `manage_inventory`.
   Storefront availability stays on the existing unauthenticated reads.
2. **External movements record the actor.** `RECEIPT`, `ADJUSTMENT`, and
   `RETURN` store `actor_user_id`. Reservation-trigger movements stay null —
   those are system rows. Reason stays the existing free-text `note`.
3. **The console is the staff UI.** `/admin/inventory` lists counters and
   recent movements. `/admin/inventory/:variantId` shows the snapshot, the
   ledger, and receive / adjust / return forms. Writes also append `audit_logs`
   (`inventory.receive` / `inventory.adjust` / `inventory.return`).
4. **Catalogue labels stay at the app boundary.** Inventory never SQL-joins
   `product_variants`. The page calls `catalog.listAll()` and maps SKU / name
   in `app/admin`. Inventory-only staff do not need `manage_catalog`.

## Alternatives considered

**A reason enum (damage, count, supplier, …).** Rejected: warehouse language
changes faster than a migration, and `note` already exists with a 240-char
cap.

**HTTP `/api/v1/admin/inventory`.** Rejected: the console already uses RSC and
server actions. A JSON surface can wait for an external WMS.

**Require `manage_catalog` to show SKUs.** Rejected: inventory-only staff would
see raw variant ids. Two module calls at the app boundary keep the join out
of SQL.

## Reasons

- The ledger is how a human reconstructs why `on_hand` is 4; without actor
  and reason it is incomplete for staff.
- Capability stays on the service, not the URL.
- Catalog and inventory remain separately owned tables.

## Consequences

- `inventory_movements.actor_user_id` is nullable and `ON DELETE SET NULL`.
- Demo memory stock has no seeded movements until a clerk writes one.
- Adjustment is still decrease-only; increases use receipt or return.

## When to revisit

A warehouse that needs locations, batches, or a reason taxonomy. A WMS
integration that consumes HTTP instead of the console.
