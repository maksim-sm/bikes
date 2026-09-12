# ADR-0025: Belarus delivery configuration

- Status: Accepted
- Date: 2026-09-12
- Amends: [ADR-0006](0006-manual-first-delivery.md)

## Context

ADR-0006 chose manual-first, table-driven quotes and a human handoff. The
first implementation only had Minsk courier and shop pickup, a numeric
`estimatedDays`, and no free-delivery rule. Checkout and the product page
needed regional Belarus coverage, configured free shipping, and a sentence
customers can read. Staff needed a place to assign a shipment without a
carrier API.

## Decision

Keep the ADR-0006 contract: no carrier client, `null` means unavailable,
quoted cost is historical. Extend the configuration as follows.

1. **Kinds.** A method is `pickup`, `courier`, or `regional`.
2. **Zones.** Fixed `costMinor` per zone. City match, then region wildcard,
   then a nationwide wildcard (empty region and city) so pickup is offered
   outside Minsk.
3. **Free threshold.** Optional `freeThresholdMinor` on the method. When a
   quote is given a `subtotalMinor` at or above the threshold, cost is `0`.
   Checkout applies this with the server cart subtotal.
4. **Estimated text.** Each zone has `estimatedText` in addition to
   `estimatedDays`. Storefront and `/api/v1/delivery/quotes` show the text.
5. **Admin assignment.** `order_management` lists methods, assigns one
   shipment per order, and records tracking. The HTTP surface is
   `/api/v1/admin/delivery/methods` and `/api/v1/admin/deliveries`.

The quote function is table-driven (`quoteMethod`), not a per-carrier class
with `quote({ destination, items })`. Parcel weight is still unused: bicycles
are priced by zone, not by a public tariff API.

## Alternatives considered

**Carrier API now.** Still rejected for the reasons in ADR-0006.

**Free shipping only as a catalogue price change.** Rejected: it hides the
pickup-vs-courier difference and cannot be turned off per method.

**Estimated days only.** Rejected: “1 дн.” is not enough for regional
promises such as “3–7 рабочих дней”.

## Reasons

- One configuration shape covers the three Belarus fulfilment modes without
  a second app or a carrier SDK.
- Free delivery is a number on the method. Changing it does not rewrite
  historical orders.
- Staff assignment is the operational half of ADR-0006.

## Consequences

- Region names must match the configured strings (`Минск`, `Минская`,
  `Гродненская`, …). A typo yields no regional quote.
- A high free threshold on courier keeps typical checkout tests paying the
  Minsk courier fee; regional uses a lower configured threshold.
- Adding a real carrier later is still a new adapter behind `delivery`, not
  a change to `orders`.

## When to revisit

The triggers in ADR-0006 still apply: volume that makes manual handoff a
bottleneck, or a formalised carrier API.
