# Checkout

Status: authoritative for placing an order. Companion: ADR-0021,
`docs/cart.md`, `docs/inventory.md`, `docs/api.md`.

Checkout is a server-controlled use case on the `orders` module. The browser
may send cart identity (via cookies), a delivery method code, and customer
data. It may not send an authoritative price, line total, delivery cost, or
order total.

## What is validated

Before an order row exists, `OrderServices.checkout` checks:

| Input              | Rule                                                                |
| ------------------ | ------------------------------------------------------------------- |
| Cart               | Exists, is owned by the caller, and has at least one line           |
| Variant            | Active, sellable, on a storefront-listed product                    |
| Inventory          | `available >= quantity` at reservation time                         |
| Price              | Current catalogue `listPriceMinor` via `pricing` integer arithmetic |
| Delivery method    | Server re-quotes for the destination; a missing quote is a conflict |
| Customer / address | Required trimmed fields; email and phone formats                    |
| Total              | `subtotal + delivery` in kopeks (`checkoutTotals`)                  |

`PlaceOrderInput` has no money fields. A Route Handler may parse
`totalMinor` (and similar) so a client cannot bypass Zod, then **drops**
those keys.

## Atomic reservation

1. Persist the order as `PLACED` with snapshotted lines and the server total.
2. Reserve each line against `orderId`.
3. If any reserve fails, cancel reservations for that order, mark the order
   `CANCELLED`, and rethrow.
4. Clear the cart only after every line is reserved.

Local demo and tests use in-memory orders and inventory. Production uses
Prisma. Demo catalogue variant ids are not Postgres UUIDs, so the demo must
not write them into `order_items`.

## HTTP

- `POST /api/v1/checkout` — public (guest or session). Resolves the actor's
  cart from cookies; a client `cartId` is ignored.
- `GET /api/v1/delivery/quotes` — public. Returns server quotes for a
  destination.
- `GET /api/v1/orders/:id` — customer. Ownership stays in the service.

The checkout DTO includes the **server** totals. It does not echo a client
total.

## Storefront

`/checkout` is a guest form. An account is not required. The page collects:

- contact name, email, and phone;
- a server-quoted delivery method (courier or pickup);
- a delivery address, or the shop pickup point when self-collection is chosen;
- a payment method (cash or card on receipt, or a bank transfer);
- consent, with links to `/legal/terms` and `/legal/privacy`.

Field errors stay on the control. Cart, stock, and delivery conflicts stay
in a page-level alert. Preview totals are display-only; the placed total is
still computed by `checkoutTotals`.
