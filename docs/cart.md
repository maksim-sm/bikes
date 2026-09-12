# Cart

Status: authoritative for the `cart` module. Schema constraints: ADR-0012.
Persistence and revalidation: ADR-0020.

A cart is a list of variant ids and quantities. It never stores a price.
Displayed totals are recalculated on every read from the current catalogue
list price and `pricing` integer arithmetic.

## Ownership

A cart is owned by exactly one of:

- a guest token in the `bikes_guest` httpOnly cookie, or
- a signed-in user (`bikes_session`).

PostgreSQL enforces the XOR and “one cart per user”. Production uses the
Prisma repository. Tests and the local demo catalogue use the in-memory
repository so demo variant ids are not written into `product_variants`.
The demo cart and auth singletons live on `globalThis` so Route Handlers
and Server Components see the same memory in `next dev`.

## Storefront

`/cart` and add-to-cart resolve the actor from the session first, then the
guest cookie. Mutations are server actions: quantity, sibling variant, and
removal. The page renders the **server** subtotal, never a browser-computed
price.

`GET /api/v1/cart` returns the same view as a DTO. Guest tokens and user
ids are not in the JSON.

## Login merge

`POST /api/v1/auth/login` (and staff login) calls `mergeOnLogin`:

1. Purchasable guest lines are copied onto the customer cart.
2. Matching variants sum quantities, capped at the line maximum (10).
3. The guest cart row is deleted and `bikes_guest` is cleared.

Unpurchasable or oversold guest lines are dropped, not carried over.

## Revalidation

`getCartView` asks `catalog` for current list prices and sibling variants,
and `inventory` for `available`. Issues on a line:

| Code                     | Meaning                                   |
| ------------------------ | ----------------------------------------- |
| `variant_missing`        | The variant is gone from the catalogue    |
| `unavailable`            | Not listed, not sellable, or zero stock   |
| `insufficient_available` | Line quantity is greater than `available` |

Availability is never written negative. Totals still use current prices so
the customer sees what checkout will charge.
