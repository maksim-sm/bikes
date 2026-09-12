# ADR-0030: Admin order operations

- Status: Accepted
- Date: 2026-09-12
- Amends: [ADR-0013](0013-independent-commerce-statuses.md),
  [ADR-0017](0017-staff-authorization-roles.md),
  [ADR-0022](0022-payment-provider-operations.md),
  [ADR-0029](0029-admin-shell-authorization.md)

## Context

`/admin/deliveries` could assign a shipment only if staff already knew the
order UUID. There was no queue, no search, no contact view, and refunds
existed only as a service method.

## Decision

1. **Orders is the order-management home.** `/admin/orders` lists every
   order. Order clerks land there. `/admin/deliveries` stays for methods
   and standalone shipment tools.
2. **Search and filters run in `orders`.** `listStaffOrders` requires
   `manage_orders`. The query matches number, email, name, phone, SKU,
   notes, and id, then optional commercial / payment / fulfillment
   filters. The page is not a permission.
3. **Status updates stay on the existing machine.** Staff complete or
   cancel a `PLACED` order. Delivery assign / ship / deliver also
   project `fulfillmentStatus` through `applyFulfillmentEvent`.
4. **Notes are order-level and internal.** `staffNotes` is hidden from
   the customer account. Shipment notes remain on the delivery record.
5. **Refunds go through `payments.refundAsStaff`.** Only
   `SUCCEEDED` / `PARTIALLY_REFUNDED` attempts accept a refund. The
   provider still owns remaining-balance checks.

## Alternatives considered

**Reuse shipment notes as the only staff comment.** Rejected: clerks need
a note before a shipment exists.

**Admin REST list/detail.** Rejected for now: the console uses RSC and
server actions, same as catalogue and deliveries.

## Consequences

- `orders.staff_notes` is a nullable text column.
- Demo memory seeds include more than one order so search/filters can be
  exercised locally.

## When to revisit

A chosen payment provider that needs a refund reason field. A requirement
to page thousands of orders.
