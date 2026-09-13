# Technical SEO

Status: authoritative companion to ADR-0035 and ADR-0036.

The storefront is the only surface search engines should index. Account,
checkout, cart, admin, and API routes are excluded in `robots.txt` and, where
they render HTML, send `noindex`.

## What we emit

| Signal              | Where                                                                  |
| ------------------- | ---------------------------------------------------------------------- |
| Title / description | `generateMetadata` / `publicPageMetadata`                              |
| Canonical           | `alternates.canonical` on public pages                                 |
| Open Graph          | `openGraph` on public pages; product image when set                    |
| `robots.txt`        | `src/app/robots.ts`                                                    |
| Sitemap             | `src/app/sitemap.ts` — static pages, catalog landings, published slugs |
| Breadcrumbs         | Visible `<nav>` + `BreadcrumbList` JSON-LD                             |
| Product             | `Product` + `AggregateOffer` JSON-LD                                   |
| Store               | `OnlineStore` on storefront chrome; `WebSite` home                     |
| Image alt           | Required on catalogue images; UI falls back to brand + name            |
| Slugs               | `^[a-z0-9]+(?:-[a-z0-9]+)*$`; uppercase URLs redirect                  |

## Catalog facets

Policy lives in `app/_lib/seo/facets.ts`. The indexable set is closed so filter
combinations cannot generate millions of URLs.

| Kind                       | URLs                                                                                    | Crawl                                         | Index             | Canonical              | Sitemap |
| -------------------------- | --------------------------------------------------------------------------------------- | --------------------------------------------- | ----------------- | ---------------------- | ------- |
| Stable landing             | `/catalog`, `/catalog/category/{slug}`, `/catalog/brand/{slug}`, `/catalog/type/{type}` | Yes (path links)                              | Yes               | Self                   | Yes     |
| Query alias of one landing | `/catalog?category=road`, `?brand=`, `?type=` / `?bicycleType=`                         | Redirect                                      | —                 | Path landing           | No      |
| Utility / combination      | `q`, price, `available`, specs, non-default sort, `page>1`, two+ landings               | Allowed if requested; controls are `nofollow` | `noindex, follow` | Nearest single landing | No      |
| Unknown landing slug       | `/catalog/category/not-a-row`, `/catalog/type/tandem`                                   | —                                             | No                | 404                    | No      |

`type` slugs are the five bicycle types in lowercase (`road`, `mtb`, `gravel`,
`city`, `kids`). Default `page=1` and default sort are omitted from URLs.
Landing facet links replace the current dimension; they do not stack. Search
and availability append query parameters with `rel="nofollow"`.

Do not add combinatorial paths or query-string variants to the sitemap.

## Boundaries

`app/_lib/seo` builds URLs and JSON-LD. Domain modules stay locale-agnostic:
they return slugs, names, kopeks, and image keys. Copy comes from `lib/i18n`.
`metadataBase` is `APP_URL`.

Do not list unpublished products in the sitemap. Do not put cart, checkout, or
`/account` URLs in it.

## Semantic HTML

Public pages use one `h1`, landmarks (`header` / `main` / `footer` / `nav`),
and lists for catalog cards and breadcrumbs. Product detail is an `article`.
Contacts use `address`.
