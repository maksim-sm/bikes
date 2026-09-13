# Technical SEO

Status: authoritative companion to ADR-0035.

The storefront is the only surface search engines should index. Account,
checkout, cart, admin, and API routes are excluded in `robots.txt` and, where
they render HTML, send `noindex`.

## What we emit

| Signal              | Where                                              |
| ------------------- | -------------------------------------------------- |
| Title / description | `generateMetadata` / `publicPageMetadata`          |
| Canonical           | `alternates.canonical` on public pages             |
| Open Graph          | `openGraph` on public pages; product image when set |
| `robots.txt`        | `src/app/robots.ts`                                |
| Sitemap             | `src/app/sitemap.ts` — static pages + published slugs |
| Breadcrumbs         | Visible `<nav>` + `BreadcrumbList` JSON-LD         |
| Product             | `Product` + `AggregateOffer` JSON-LD               |
| Store               | `OnlineStore` on storefront chrome; `WebSite` home |
| Image alt           | Required on catalogue images; UI falls back to brand + name |
| Slugs               | `^[a-z0-9]+(?:-[a-z0-9]+)*$`; uppercase URLs redirect |

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
