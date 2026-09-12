# Persistent wishlist

Status: authoritative companion to ADR-0028.

A signed-in customer saves **products**, not variants. There is no guest
wishlist: anonymous visitors are sent to `/login`.

## Surfaces

| Path                | Purpose                                              |
| ------------------- | ---------------------------------------------------- |
| Product page        | Add or remove the bicycle; anonymous users see login |
| `/account/wishlist` | Saved items with stock, deletion, and price flags    |

HTTP:

| Method | Path                                 | Policy          |
| ------ | ------------------------------------ | --------------- |
| GET    | `/api/v1/customers/:userId/wishlist` | `customer`      |
| POST   | `/api/v1/customers/:userId/wishlist` | `customer_only` |
| DELETE | `/api/v1/customers/:userId/wishlist` | `customer_only` |

POST and DELETE take `{ productId }`. GET returns `productIds` plus `items`
with the current catalogue price, saved snapshot, stock, and issue flags.

## Invariants

- **No duplicates.** Domain `addProduct` throws `wishlist_duplicate`. The
  unique index on `(wishlist_id, product_id)` is the persistence guarantee.
  A second add is HTTP 409.
- **Authenticated persistence.** One wishlist per user. Local compose keeps
  it in memory (demo catalogue ids are not Postgres UUIDs). Production uses
  Prisma.
- **Price snapshot.** `saved_price_minor` is the catalogue lowest list price
  at add time. The view flags `price_changed` when it differs from today.
- **Out of stock.** Listed products with no sellable variant `available > 0`
  stay on the list and show `out_of_stock`.
- **Deleted / unpublished.** Missing catalogue rows show `missing`. Draft or
  archived products show `unavailable`. Items are not auto-removed.

Wishlist services live on `identity`. Catalogue and inventory are ports
wired in compose.
