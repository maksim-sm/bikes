# ADR-0012: First catalogue schema — variants own stock

- Status: Accepted
- Date: 2026-09-11

## Context

The first Prisma migration has to create users, profiles, brands, categories,
products, variants, media, carts, wishlists, and addresses together, because
foreign keys between them are load-bearing. Two product questions from the
architecture contract were still open and would have been silently decided by
whatever landed in `schema.prisma`: whether a variant carries its own stock,
and whether product facts are modelled as a generic attribute store.

Prisma 7 (ADR-0004) also requires a driver adapter and a generated client
outside `node_modules`, which this schema's supporting files (`prisma.config.ts`,
`src/lib/db.ts`) implement.

## Decision

1. **Stock lives on `product_variants`**, not on `products`. Frame size and
   colour are explicit columns. A size that is sold out does not hide the
   other sizes of the same bicycle.
2. **No entity-attribute-value table.** Specifications that are not yet needed
   (groupset, material) are omitted rather than stuffed into a key/value bag.
   When they are needed they become columns or a typed table of known keys.
3. **`list_price_minor` lives on the variant** as integer kopeks (ADR-0010).
   It is the catalogue list price. What the customer is shown — VAT, discounts —
   remains `pricing`'s job and is not in this migration.
4. **Wishlists belong to `identity`**: one wishlist per user, items pointing at
   products (not variants), because a customer saves "this bicycle" before they
   pick a size.
5. **`product_media` belongs to `catalog`**. `media` stores the object and the
   opaque key; the catalogue stores which product it illustrates, the alt text,
   and the primary/gallery role.
6. **Partial unique indexes and check constraints that Prisma cannot express**
   are written in the migration SQL and are part of this decision: one default
   address per user, one cart per signed-in user, a cart owned by exactly a
   user _or_ a guest token, one primary image per product, non-negative stock
   and price, positive cart quantity.

## Alternatives considered

**Stock on the product, variants as display-only SKUs.** Rejected: a bicycle
that is available in M and sold out in XL is the common case, and collapsing
stock to the parent makes that unsellable or dishonest.

**A `product_attributes(key, value)` table.** Rejected as EAV. It looks
flexible and becomes unqueryable: "every 29er in stock" turns into a self-join
with no type, no constraint, and no index that helps. Frame size and colour
are known, finite, and part of the SKU.

**Wishlist items pointing at variants.** A close call. Rejected because the
saved-for-later intent is about the bicycle, and forcing a size at save time
creates wishlist rows that go stale when that size sells out.

**Putting list price in a `pricing` table from day one.** Faithful to the
module boundary, but empty: there is no second price, no VAT rule, and no
discount yet. A list price on the variant is product data; moving it later is
a column copy, not a rewrite.

## Reasons

- Independent per-variant stock matches how a bike shop actually sells: the
  SKU is size × colour, and inventory is counted there.
- Explicit columns are constrainable and indexable. EAV is neither.
- The first migration is the cheapest moment to pick the grain of stock; moving
  it after orders exist means rewriting history.
- Prisma's schema language cannot say `WHERE is_default`, so the partial
  unique indexes belong in the SQL and must not be "cleaned up" by a later
  regenerate.

## Consequences

- Accessories without a frame size will not fit `frame_size`/`color` as
  required strings. Adding accessories means a later migration that either
  relaxes those columns or introduces a different variant shape.
- `pricing` still has no tables. Displayed price is computed from
  `list_price_minor` until that module grows.
- Wishlisting a specific size is not representable without a follow-up column.
- Shadow-database creation during `prisma migrate dev` needs `CREATEDB` on the
  migrating role. `prisma migrate deploy` does not.

## When to revisit

- Accessories or clothing join the catalogue and do not have frame sizes.
- A real need appears to save a specific variant on a wishlist.
- VAT or discount rules require a price table that is not a trivial function of
  `list_price_minor`.
- Stock must be reserved against incoming purchase orders or multiple
  warehouses, which this single integer cannot express.

Finding EAV more convenient for an admin UI is not a trigger.
