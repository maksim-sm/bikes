# ADR-0021: Server-controlled checkout totals

- Status: Accepted
- Date: 2026-09-12

## Context

Cart lines are variant ids and quantities (ADR-0020). Inventory reservations
are race-safe (ADR-0014). Delivery quotes live on `delivery` (ADR-0006).
Money is integer kopeks (ADR-0010). The remaining failure mode is a browser
that posts `totalMinor: 1` and expects the store to honour it.

## Decision

1. **Checkout is an `orders` use case**, not a new module. `checkout` and
   `placeOrder` are the same function.
2. **The input has no prices.** Customer data, destination, delivery method
   code, and cart identity only. HTTP may accept money fields so Zod does
   not reject a forged body; the handler never forwards them.
3. **The server recomputes everything**: list price, line totals, delivery
   quote, and `totalMinor = subtotalMinor + deliveryCostMinor`.
4. **Reservation is tied to the new order id.** A later reserve failure
   releases holds and cancels the order so stock and the commercial
   agreement stay aligned.

## Consequences

- A client cannot choose the authoritative order total.
- Price changes after add-to-cart are applied at checkout.
- Guest checkout is allowed; `GET /api/v1/orders/:id` remains a customer
  route with ownership checks.

## When to revisit

If a payment provider must pre-authorize an amount before the order row
exists, keep the quote on the server and pass that amount to the provider —
do not take it from the browser.
