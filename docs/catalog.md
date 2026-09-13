# Catalogue browsing

Status: companion to ADR-0012 / ADR-0014. Listing is **PostgreSQL**, not a
search engine. Do not add Elasticsearch.

## Discovery query

`GET /api/v1/products` filters in the catalog repository (`WHERE` on
`products` / `product_variants`). Pagination is `skip`/`take` plus a
filtered `count`. Sort fields: `publishedAt` (default desc), `name`, `price`
(minimum active variant `list_price_minor`), `relevance` (default when `q` is
set).

Allow-listed filters:

| Query                                      | Column / source                                               |
| ------------------------------------------ | ------------------------------------------------------------- |
| `category`                                 | `categories.slug` and descendants                             |
| `brand`                                    | `brands.slug`                                                 |
| `bicycleType`                              | `products.bicycle_type` (`ROAD` `MTB` `GRAVEL` `CITY` `KIDS`) |
| `frameSize`                                | `product_variants.frame_size`                                 |
| `wheelSize`                                | `product_variants.wheel_size`                                 |
| `minPrice` / `maxPrice`                    | integer kopeks on `list_price_minor`                          |
| `available`                                | variant ids from **inventory** (`available > 0`)              |
| `q`                                        | Indexed search: brand, model, SKU, spec text (ADR-0019)       |
| `frameMaterial` / `groupset` / `brakeType` | typed product columns                                         |

Availability is a second query owned by `inventory`. Catalog never joins
`inventory_items`.

## Search

`q` is one PostgreSQL query against `products.search_vector` (GIN `tsvector`)
and `products.search_text` (GIN trigram). The document is brand + model +
SKU + specification text, maintained by triggers. Matching ids are hydrated
with a single `findMany` that includes brand, category, and variants — not
one query per product. With `q`, the default sort is `relevance`.

## Facets

`GET /api/v1/categories` and `GET /api/v1/brands` return the trees/lists used
to build the storefront filters. Specifications that are not columns yet stay
off the query string (no EAV).

Storefront navigation uses a **closed set of path landings** so filters do not
create an indexable cartesian product (`docs/seo.md`, ADR-0036):

| Landing                        | Path                                            |
| ------------------------------ | ----------------------------------------------- |
| Full catalog                   | `/catalog`                                      |
| One category (and descendants) | `/catalog/category/{slug}`                      |
| One brand                      | `/catalog/brand/{slug}`                         |
| One bicycle type               | `/catalog/type/{road\|mtb\|gravel\|city\|kids}` |

`/catalog?category=`, `?brand=`, and `?type=` / `?bicycleType=` redirect to the
matching landing. Search, price, availability, sort, pagination, and stacked
landings render the filtered list but send `noindex, follow` and canonicalize
to the nearest landing. Those URLs are not in `/sitemap.xml`.

The storefront page size is **24**. Prev/next links use `rel="nofollow"`.
Listing SQL is one filtered `findMany` with batched includes — not N+1, and
not a reason to add Redis (`docs/performance.md`).

## Product detail

Storefront pages under `/products/[slug]` are Server Components. They load a
published product through catalog services, then ask **inventory** for
per-variant availability by id (no catalog→inventory SQL join). Delivery quotes
for Минск come from the delivery module. Images are opaque media keys. Uploaded files are stored by the `media` module
and served from `/api/media/…`; unknown demo keys still render placeholders.
Slugs are lowercase hyphenated ASCII; a mixed-case URL redirects to the stored
slug. Published slugs appear in `/sitemap.xml` (`docs/seo.md`).

Variant size and color are real radio groups. The selected option is marked
with a thicker border **and** the visible word «выбрано»; color is never the
only cue. Add-to-cart is a server action on the signed-in cart, or on a
guest `bikes_guest` cookie when there is no session. See `docs/cart.md`.

## Staff catalogue

`/admin/products` is the staff write path (create, edit, publish, unpublish).
Admin services require the `manage_catalog` capability (admin and manager).
Creates start as `DRAFT`. Publish sets `PUBLISHED` and `publishedAt`;
unpublish returns the row to `DRAFT`. Storefront `listPublishedProducts` and
`getProductBySlug` still use `isListedOnStorefront` — drafts never appear on
`/catalog`, `/products/[slug]`, or `GET /api/v1/products`.

## Variants

A sellable bicycle is a product plus one or more variants. Each variant has:

| Field                         | Notes                                             |
| ----------------------------- | ------------------------------------------------- |
| SKU                           | Unique across the catalogue                       |
| barcode / product code        | Optional, unique when present                     |
| frame size, color, wheel size | Unique together on the same product               |
| list price                    | Integer kopeks, currency `BYN`                    |
| status                        | `active` (sellable) or `inactive` (hidden)        |
| media                         | Opaque keys via `product_media` / `variant_media` |

Inactive variants stay off the storefront and public API. Duplicate SKUs and
invalid size × color × wheel combinations are rejected in domain validation
before persistence; PostgreSQL unique indexes remain the last line of defence.
