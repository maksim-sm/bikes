# Catalogue browsing

Status: companion to ADR-0012 / ADR-0014. Listing is **PostgreSQL**, not a
search engine. Do not add Elasticsearch.

## Discovery query

`GET /api/v1/products` filters in the catalog repository (`WHERE` on
`products` / `product_variants`). Pagination is `skip`/`take` plus a
filtered `count`. Sort fields: `publishedAt` (default desc), `name`, `price`
(minimum active variant `list_price_minor`).

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
| `q`                                        | `ILIKE` on product and brand name                             |
| `frameMaterial` / `groupset` / `brakeType` | typed product columns                                         |

Availability is a second query owned by `inventory`. Catalog never joins
`inventory_items`.

## Facets

`GET /api/v1/categories` and `GET /api/v1/brands` return the trees/lists used
to build the storefront filters. Specifications that are not columns yet stay
off the query string (no EAV).
