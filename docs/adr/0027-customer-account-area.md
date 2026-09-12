# ADR-0027: Customer account area

- Status: Accepted
- Date: 2026-09-12
- Amends: [ADR-0002](0002-nextjs-app-router.md),
  [ADR-0016](0016-customer-authentication.md),
  [ADR-0017](0017-staff-authorization-roles.md)

## Context

ADR-0002 reserved `(account)/` for the signed-in customer. Auth, profile,
addresses, and a single-order GET already existed as services. Customers
still had no place to change a password, see order history, or read the
shipment facts staff type in.

## Decision

Ship a **customer self-service area** under `/account`, with `/login` and
`/register` as the public door.

The area shows:

- profile (name, phone; email read-only)
- address book
- order history and order detail
- payment status and fulfillment status from the order row
- shipment tracking when a shipment exists (no staff notes)
- authenticated password change
- logout of all sessions (`revokeAllForUser`)

Mutations from this UI go through Server Actions. Route Handlers exist for
the same writes so non-UI clients stay on the ADR-0015 envelope. Domain
ownership checks do not move.

Password change revokes every session and issues a new cookie for the
current browser. Logout-all revokes every session and clears this cookie.
Both reuse the session port added for password reset (ADR-0016).

## Alternatives considered

**Staff-only order lookup.** Rejected: customers already have an order id
after checkout and need payment and delivery status without calling the
shop.

**Carrier or payment-provider widgets.** Rejected: no provider is chosen
(ADR-0005, ADR-0006). The account page displays stored facts.

**Shared admin/customer console.** Rejected: ADR-0017 keeps staff titles
off the storefront navigation.

## Reasons

- The services already isolated customer data; the missing piece was the
  signed-in UI and two auth use cases (change password, revoke all).
- Showing payment and fulfillment projections avoids a second source of
  truth.
- Logout-all is cheap because sessions are hashed rows, not JWTs.

## Consequences

- Guest orders never appear in history (`userId` is null).
- A customer who registered but never saved a profile sees an empty form.
- Production profile/address writes now go to Prisma; local demo stays
  in-memory and seeds a verified customer.

## When to revisit

A chosen payment or carrier API that should push live status into the
account page. A requirement to attach guest orders to an account after
the fact.
