# ADR-0026: Staff-entered shipment tracking

- Status: Accepted
- Date: 2026-09-12
- Amends: [ADR-0006](0006-manual-first-delivery.md),
  [ADR-0025](0025-belarus-delivery-configuration.md)

## Context

ADR-0006 hands shipment arrangement to a human. ADR-0025 added assignment
and a tracking number. Operations still need a carrier name, a page a
human can open, the times the parcel left and arrived, and a notes field.
None of that requires a carrier contract.

## Decision

Store tracking as **facts staff type in**:

- `carrierName`
- `trackingNumber`
- `trackingUrl` (`http` or `https` only)
- `shippedAt`
- `deliveredAt`
- `notes`

There is no carrier client, webhook, or status poll. `updateTracking`
writes these fields without changing shipment status. `markShipped` and
`markDelivered` still own the status machine and fill an empty timestamp
with "now" if staff have not already set one.

## Alternatives considered

**Carrier tracking API.** Rejected for the same reasons as ADR-0006: no
chosen carrier, bicycle parcels are often arranged ad hoc, and a poll
built before that decision would be thrown away.

**Tracking number only.** Rejected: staff already keep the carrier name,
a public track page, and handover notes in chat. Those belong on the
shipment row.

## Reasons

- The admin screen is the operational system of record until volume
  justifies an integration.
- A URL is a link a person can open. The shop does not parse carrier
  HTML or JSON.
- Correctable timestamps avoid "the courier came yesterday but we
  clicked the button today".

## Consequences

- A stale or mistyped URL is possible. Format is checked; the page is
  not fetched.
- Status and timestamps can disagree until staff mark shipped/delivered.
  That is accepted: times are operational, status is the machine.
- Adding a carrier adapter later maps into these fields; it does not
  replace them.

## When to revisit

The triggers in ADR-0006: a formalised carrier API, or volume that makes
manual tracking an error source.
