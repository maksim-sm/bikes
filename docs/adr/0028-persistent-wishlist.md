# ADR-0028: Persistent wishlist

- Status: Accepted
- Date: 2026-09-12
- Amends: [ADR-0012](0012-first-catalogue-schema.md),
  [ADR-0020](0020-persistent-cart.md),
  [ADR-0027](0027-customer-account-area.md)

## Context

Identity already had a wishlist aggregate (products, not variants) and a GET
route. Compose used an in-memory repository whose catalogue port always
returned “not found”, so add could not persist a real bicycle. There was no
storefront control, no account page, and no way to show that a saved product
was gone, sold out, or repriced.

## Decision

1. **Authenticated only.** A wishlist belongs to a user. Guests are not
   given a cookie or a parallel list.
2. **Products, not variants** (ADR-0012). Saving “this bicycle” does not
   pick a size.
3. **Duplicates are impossible.** Domain rejects a second add of the same
   `productId`. `(wishlist_id, product_id)` stays unique.
4. **Price snapshot on the item.** `saved_price_minor` is the lowest list
   price at add time. The read model compares it to the current catalogue
   price and flags a change. Items stay on the list.
5. **Deleted and out-of-stock items stay.** Missing catalogue rows, unpublished
   products, and zero availability are view issues, not deletions.
6. **Prisma in production.** Local demo stays in memory because demo product
   ids are not Postgres UUIDs (same reason as carts in ADR-0020).

## Alternatives considered

**Guest wishlist cookie.** Rejected: the requirement is authenticated
persistence, and a second list would have to merge on login the way carts do.

**Variant-level wishlist.** Already rejected in ADR-0012. A sold-out size
would stale the row even when another size of the same bicycle is in stock.

**Auto-remove missing products.** Rejected: the customer should see that the
saved bicycle disappeared, not lose the row silently.

## Reasons

- Duplicate rows are a data bug the unique index can prove never happens.
- A price snapshot is the only way to show a change without inventing a
  second price in `pricing`.
- Keeping stale rows matches the cart read model (ADR-0020): issues, not
  silent mutation.

## Consequences

- Add requires a catalogue hit so the snapshot can be stored.
- Staff deleting a product that is still wishlisted is blocked by
  `ON DELETE RESTRICT`. Archive or unpublish instead; the view shows
  `unavailable` or `missing`.
- The GET DTO grew an `items` array. `productIds` remains for callers that
  only need membership.

## When to revisit

A requirement to save a specific size (ADR-0012). A guest list that must
merge on login. A pricing module that owns more than `list_price_minor`.
