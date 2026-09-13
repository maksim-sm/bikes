# ADR-0035: Technical SEO on the storefront

- Status: Accepted
- Date: 2026-09-13
- Amends: [ADR-0002](0002-nextjs-app-router.md), [ADR-0009](0009-russian-first-i18n.md)
- Amended by: [ADR-0036](0036-faceted-navigation-seo.md)

## Context

The catalogue and product pages existed without canonical URLs, a sitemap,
robots rules, Open Graph beyond a locale, or structured data. Nav items for
delivery and contacts were not links. Search engines would have indexed
checkout and the admin shell if they found them.

## Decision

1. **Public metadata is explicit.** Each indexable page sets title, description,
   canonical, and Open Graph through `publicPageMetadata`. `metadataBase` is
   `APP_URL`.
2. **`robots.ts` and `sitemap.ts` are the machine contracts.** The sitemap lists
   `/`, `/catalog`, `/delivery`, `/contacts`, legal pages, and published product
   slugs only.
3. **JSON-LD is complementary**, not a substitute for visible HTML. Product
   pages emit `Product`; the chrome emits `OnlineStore`; home emits `WebSite`.
   Breadcrumbs are both a `<nav>` and a `BreadcrumbList`.
4. **Slugs stay lowercase hyphenated ASCII.** `getProductBySlug` normalizes
   case; a mismatched URL redirects to the stored slug.
5. **Private flows are `noindex`.** Account, cart, checkout, confirmation,
   ui-kit, and admin already (or now) opt out.

## Alternatives considered

**Locale-prefixed routes (`/ru/catalog`).** Rejected: ADR-0009 deferred
`/[locale]/` routing. Canonicals are the unprefixed paths.

**A third-party SEO plugin.** Rejected: the App Router already owns metadata,
sitemap, and robots.

## Consequences

- Delivery and contacts are real pages so the header links resolve and enter
  the sitemap.
- Changing `APP_URL` rewrites every canonical and sitemap URL.

## When to revisit

A second language (then hreflang). Category landing pages as first-class
routes. A dedicated OG image pipeline beyond the product gallery.
