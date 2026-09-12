# Delivery

Status: authoritative for quoting and staff shipment assignment. Companion:
ADR-0006, ADR-0025, `docs/checkout.md`, `docs/api.md`.

Delivery is **manual-first** and Belarus-only. The application quotes from
configured methods and zones. Staff arrange the parcel and record the tracking
reference. There is no carrier API.

## Methods

| Kind       | Demo code       | Where it applies                          |
| ---------- | --------------- | ----------------------------------------- |
| `pickup`   | `minsk-pickup`  | Shop collection; available nationwide     |
| `courier`  | `minsk-courier` | City zone for Минск                       |
| `regional` | `by-regional`   | Region-wildcard zones for the six oblasts |

A method that does not match a destination returns `null`. That is a normal
outcome, not an error.

## Zones and price

Each zone has a **fixed** `costMinor` in kopeks. Matching order:

1. Active city zone in the same region.
2. Active region wildcard (`city === ""`).
3. Nationwide wildcard (`region === ""` and `city === ""`) — used for pickup.

If a method has `freeThresholdMinor` and the cart `subtotalMinor` is at or
above it, the quoted cost is `0`. The threshold is configuration, not a
promotion engine. Checkout re-quotes with the server subtotal; the browser
`subtotalMinor` query is display-only.

The quoted cost is captured on the order at placement and is never recomputed.

## Estimated text

Zones carry `estimatedDays` (sort / API; `0` is same-day pickup) and
`estimatedText` (the sentence shown on the product page, checkout radios,
and quotes DTO). Copy lives in `src/lib/i18n/messages/ru.ts` for the demo
catalogue.

## Admin assignment

`order_management` staff assign at most one shipment per order (`ASSIGNED` →
`SHIPPED` → `DELIVERED`, or `FAILED` from an open state). They set the
captured cost and later the tracking facts. Catalog-only staff do not see
this screen.

## Shipment tracking

Tracking is staff-entered. There is no carrier client and no status poll.
A shipment stores:

| Field            | Meaning                                    |
| ---------------- | ------------------------------------------ |
| `carrierName`    | Who is carrying the parcel (free text)     |
| `trackingNumber` | Reference the carrier gave the shop        |
| `trackingUrl`    | `http(s)` page a human can open            |
| `shippedAt`      | When it left, if known                     |
| `deliveredAt`    | When it was handed over, if known          |
| `notes`          | Operational remarks (access, call, pickup) |

`updateTracking` writes these fields without changing status. `markShipped`
requires a tracking number and sets `shippedAt` if it is still empty.
`markDelivered` sets `deliveredAt` the same way. Staff may correct times
afterwards. `deliveredAt` cannot be earlier than `shippedAt`.

## Persistence

Local and test compose use the demo method table and an in-memory shipment
map. Production reads methods/zones from Prisma (seeded by the delivery
configuration migration) and writes shipment rows to `deliveries`.
