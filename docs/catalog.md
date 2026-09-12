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

## Product detail

Storefront pages under `/products/[slug]` are Server Components. They load a
published product through catalog services, then ask **inventory** for
per-variant availability by id (no catalog→inventory SQL join). Delivery quotes
for Минск come from the delivery module. Images are opaque media keys rendered
as `/api/media/…` placeholders until the object store is wired.

Variant size and color are real radio groups. The selected option is marked
with a thicker border **and** the visible word «выбрано»; color is never the
only cue. Add-to-cart is a server action on a guest `bikes_guest` cookie.
