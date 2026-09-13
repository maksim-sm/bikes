# Storefront performance

Status: companion to ADR-0037. Measured 2026-09-13 on this machine. Do not add
Redis, a CDN product, or a search engine because this document exists — add
them when a number here (or a newer measurement) says the current stack is
the bottleneck.

## How we measured

| Surface                           | How                                                                           |
| --------------------------------- | ----------------------------------------------------------------------------- |
| Production JS / HTML              | `next start` on `:3012`, curl of `/`, `/catalog`, `/delivery`                 |
| Lighthouse (empty Prisma catalog) | mobile, simulated 4G, `/catalog`                                              |
| Images / LCP markup               | demo storefront on `:3000` (`NODE_ENV !== production` uses in-memory catalog) |
| Queries                           | read of `prisma-catalog-repository` and storefront loaders                    |

Local `next start` talks to Postgres. The database in this environment is
behind the Prisma schema (`products.model_year` missing), so `/products/emonda`
returns 500 in production mode. Catalog HTML on `:3012` therefore had **no
product cards**. Image and LCP markup numbers come from the working demo
storefront. Dev JS (Next devtools, ~3.8 MB of script tags) is **not** a
production figure.

## Core Web Vitals (production `/catalog`, no products)

| Metric                 | Value               | Note                                                     |
| ---------------------- | ------------------- | -------------------------------------------------------- |
| Lighthouse performance | 1.00                | Empty listing; LCP was the lead paragraph                |
| FCP                    | 0.9 s               | Simulated mobile                                         |
| LCP                    | 1.7 s               | Text, not an image                                       |
| CLS                    | 0                   | No images to shift                                       |
| TBT (INP proxy)        | 20 ms               | No field INP sample; no extra client island on catalog   |
| TTFB                   | 10–18 ms            | Same-machine `next start`                                |
| HTML                   | 33 KB / 5.5 KB gzip |                                                          |
| Script tags            | 567 KB uncompressed | Next App Router runtime + polyfill, not a storefront SPA |

INP needs real clicks. The catalog listing is a Server Component; the product
page adds one client island (`ProductPurchase`). That is the INP surface to
watch, not a third-party widget.

## Images and LCP

Demo placeholders are **678 B SVG** (`1200×800` viewBox) at
`/api/media/demo/…`. Real uploads may be up to 8 MB JPEG/PNG/WebP with stored
width/height.

**Before this audit** storefront `<img>` tags had no `width`, `height`,
`sizes`, `loading`, or `fetchpriority`. Product CSS already reserved `3 / 2`
on the hero; catalog cards did not. The first catalog card and the product
hero are the LCP candidates once photos exist.

**Now:** `MediaImage` always emits intrinsic size (default 1200×800), `sizes`,
and `decoding`. The product hero and the first catalog card on page 1 use
`fetchpriority="high"` and eager load; the rest are lazy. Catalog cards use
`aspect-ratio: 3 / 2`.

## Queries and N+1

| Path                    | What runs                                                                                                                    | N+1?                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `listPublished`         | `count` + one `findMany` with `include` (products, variants, media, brand, category). Category tree is one extra `findMany`. | No. Prisma batches `IN (...)`.           |
| Search / price sort     | Rank ids, then hydrate **the page** with one `findMany`.                                                                     | No.                                      |
| Product page            | `findBySlug` + inventory `listAvailabilityByVariantIds` + delivery quotes.                                                   | No.                                      |
| Product metadata + page | Used to call that loader **twice** per request.                                                                              | Duplicate work, not N+1. Now `cache()`d. |
| Catalog metadata + page | Used to list categories/brands twice.                                                                                        | Same; now `cache()`d.                    |
| Header                  | `cookies()` + session resolve on every public page.                                                                          | One auth read; blocks ISR.               |
| Admin `save` images     | `create` per image in a loop.                                                                                                | Write-path N+1; not on the hot path.     |

`listPublished` hydrates the **full** product graph for each card. Fine for
tens of products. When a page of 24 includes dozens of variants and gallery
images, add a list projection — do not add Redis in front of the same payload.

## Client JavaScript

Storefront routes are Server Components. Client islands:

- product purchase / wishlist
- cart editor, checkout form
- login / register / account forms
- admin forms
- `src/ui/field.tsx` (`useId`)

Do not import catalog or identity barrels from those files. Do not grow the
product island with a client image gallery until INP is measured with real
photos.

## Caching

| Resource       | Header                                                 | Why                             |
| -------------- | ------------------------------------------------------ | ------------------------------- |
| `/api/v1/*`    | `no-store`                                             | Session, cart, prices           |
| HTML pages     | none (`force-dynamic`)                                 | Header reads the session cookie |
| `/api/media/…` | `public, max-age=86400, stale-while-revalidate=604800` | Keys are immutable object ids   |

Browser HTTP cache for media is enough. A Redis page cache would sit in front
of a 10 ms TTFB and a personalized header.

## Pagination

`GET /api/v1/products` already `skip`/`take`s (max page size 100). The
storefront lists **24** products (`CATALOG_PAGE_SIZE`). `page>1` is
`noindex, follow` and not in the sitemap (ADR-0036). The listing now renders
prev/next with `rel="nofollow"` when `total` exceeds 24.

## When Redis or external search is allowed

Revisit only with a new measurement that shows one of:

- p95 listing/search query time on a **realistic** catalogue (thousands of
  SKUs) after GIN/trigram and a thinner list projection;
- origin TTFB dominated by repeat identical catalog HTML for anonymous users
  after the header no longer forces dynamic rendering;
- media origin bandwidth, not browser cache, is the bill.

Until then: Postgres, `cache()` per request, and HTTP cache on media.
