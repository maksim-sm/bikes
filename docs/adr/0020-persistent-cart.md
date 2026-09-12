# ADR-0020: Persistent carts with server-side totals

- Status: Accepted
- Date: 2026-09-12

## Context

Cart services existed with quantity rules and an in-memory repository. The
storefront always used a guest cookie, even after login. The cart page
multiplied `listPriceMinor * quantity` in the page. That is the failure
mode ADR-0010 and architecture §14 warn about: a browser-submitted price.

## Decision

1. **One owner.** Guest token or user id, never both (already in the
   schema). Signed-in visitors use the session cart.
2. **Merge on login.** Application-layer hook after `auth.login` — identity
   does not import `cart`. Guest lines that are still purchasable move onto
   the user cart; the guest cookie is cleared.
3. **Prices and availability are read-time.** `getCartView` takes current
   catalogue prices and inventory `available`. `pricing` computes line
   totals and the subtotal in integer kopeks.
4. **Prisma in production.** The repository writes `carts` / `cart_items`.
   Local demo stays in-memory because the demo catalogue ids are not
   Postgres UUIDs.

## Consequences

- Checkout can trust the cart as ids and quantities only.
- A price change after add-to-cart is visible before payment.
- Oversold lines stay in the cart with an issue; they do not drive
  `available` below zero.

## When to revisit

If cart holds must reserve stock at add-to-cart time, that is an inventory
reservation against `cart_id` (ADR-0014), not a change to this read model.
