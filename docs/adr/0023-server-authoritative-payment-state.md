# ADR-0023: Server-authoritative payment state

- Status: Accepted
- Date: 2026-09-12
- Amends: [ADR-0005](0005-provider-neutral-payments.md),
  [ADR-0013](0013-independent-commerce-statuses.md)

## Context

ADR-0005 forbids marking an order paid from a browser return URL. ADR-0013
keeps `payments.status` as the money source of truth, with a copy on the
order, and said to revisit the enum when auth-then-capture appears.

The provider port (ADR-0022) can now create, poll, cancel, refund, and
verify webhooks. The attempt still collapsed too many steps into `PENDING`
and `SUCCEEDED`: a just-created session, an authorization hold, an expired
redirect, and a refund that has been requested but not settled were
inexpressible.

## Decision

Payment status changes only on the server, from:

1. a verified provider webhook, or
2. a provider poll (`getPaymentStatus` / `observeReturn`), or
3. an explicit server operation (`cancelPayment`, `refundPayment`).

A browser return URL never writes status. `GET /api/v1/payments/:id` may
receive `?status=succeeded` from a provider redirect; that query is ignored.
The handler calls `observeReturn`, which asks the provider and applies a
**legal** transition.

The attempt lifecycle is:

`CREATED` → `PENDING` → `AUTHORIZED` → `SUCCEEDED` (paid), with
`FAILED` / `EXPIRED` / `CANCELLED` from the open states, then
`REFUND_PENDING` → `REFUNDED` or `PARTIALLY_REFUNDED` after capture.

`AUTHORIZED` is a hold. `SUCCEEDED` is captured. Partial refunds are
optional: a provider that cannot split a refund reports `REFUNDED` only.

`orders.payment_status` remains a projection written from these events.
`payments` still does not write order rows.

## Alternatives considered

**Keep `PENDING` / `SUCCEEDED` and treat authorized as paid.** Rejected:
voiding a hold is not a refund, and staff cannot see the difference.

**Let the return URL apply a signed query status.** Rejected: the signature
would be provider-specific, and ADR-0005 already chose webhooks as
authoritative. A poll on return is enough to refresh the page.

**One status field on the order.** Already rejected by ADR-0013.

## Reasons

- Auth-then-capture and async refunds are normal on Belarusian gateways.
- Illegal transitions must fail closed so a replayed "paid" cannot un-refund
  or skip a hold.
- Return-URL query parameters are attacker-controlled even when they look
  official.

## Consequences

- New Prisma enum values: `CREATED`, `AUTHORIZED`, `EXPIRED`,
  `REFUND_PENDING`. At most one `CREATED` / `PENDING` / `AUTHORIZED`
  attempt per order.
- The mock provider starts attempts as `CREATED`. Tests that assumed
  `PENDING` immediately after `createPayment` were updated.
- A return poll that reports an illegal status leaves the local attempt
  unchanged.

## When to revisit

- A chosen provider requires partial capture as a first-class status.
- Settlement / payout reporting needs its own machine (do not overload
  this one).
