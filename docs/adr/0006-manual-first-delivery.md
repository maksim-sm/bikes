# ADR-0006: Manual-first delivery integration

- Status: Accepted
- Date: 2026-09-11

## Context

Delivery for a Belarusian bicycle retailer plausibly means courier within
Minsk, regional shipping via Belpochta or a private carrier, pickup points, and
in-store collection. Bicycles are bulky and awkward to ship, so rates often
depend on negotiated arrangements rather than published tariff APIs. The
delivery model is an unresolved business decision.

Order volume at launch will be low enough that a human can arrange each
shipment.

## Decision

Implement delivery **manual-first**: the application quotes shipping from
configured rules held in our own database, records the customer's chosen method
and the quoted cost on the order, and then hands off to a human. Staff arrange
the actual shipment and record the tracking reference through the admin area.

No carrier API is integrated in the first implementation. The `delivery` module
still exposes the interface from `docs/architecture.md`:

```ts
export interface DeliveryMethod {
  readonly code: string;
  quote(input: { destination: Destination; items: ParcelItem[] }):
    Promise<{ costMinor: number; estimatedDays: number } | null>;
}
```

The initial implementations are table-driven: a zone-and-weight rate table
maintained by staff. Returning `null` means unavailable for that destination,
which is a normal outcome rather than an error.

**The quoted cost is captured on the order at order time and never
recomputed.** Tariffs change; an order's recorded shipping cost is a historical
fact.

## Alternatives considered

**Integrate a carrier API immediately.** Rejected: we do not yet know which
carrier, bicycle shipping frequently prices by negotiated arrangement rather
than published API rates, and an integration built before the business model is
settled is likely to be discarded.

**Flat-rate shipping only.** Simplest possible option and genuinely tempting.
Rejected because regional cost variation within Belarus is large enough for a
bulky item that a flat rate either loses money on distant orders or
overcharges local ones.

**Free shipping folded into product prices.** Rejected for the same reason, plus
it makes the catalogue price misleading for pickup customers.

**Quote-on-request with no automated pricing.** Rejected: it breaks self-service
checkout, which is the point of the store.

## Reasons

- It delivers a working, honest checkout without depending on an unresolved
  business decision or a carrier contract.
- Table-driven rates are exactly the thing staff can adjust as real shipping
  costs become known, without a deployment.
- At launch volume, human handoff is cheaper and more reliable than an
  integration, and it generates the operational knowledge needed to specify one
  properly later.
- The interface means adding a carrier API later is a new implementation behind
  an existing contract, not a change to `orders`.

## Consequences

- Shipping costs can be wrong until the rate table is tuned against reality.
  Staff must be able to adjust an order's shipping cost, and the order must
  record that it was adjusted.
- Manual handoff does not scale. This is an accepted, temporary cost with a
  known remedy.
- Tracking references are entered by hand and are therefore subject to typos;
  the admin UI should validate format where a carrier's format is known.
- No automated delivery status updates to customers in the first version.

## When to revisit

- Order volume reaches the point where manual shipment arrangement is a
  bottleneck or an error source — this is the expected trigger.
- A carrier relationship is formalised and that carrier offers a usable rate and
  tracking API.
- Customers demonstrably abandon checkout because of shipping cost inaccuracy or
  missing tracking visibility.
