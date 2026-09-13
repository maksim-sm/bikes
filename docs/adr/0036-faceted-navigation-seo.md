# ADR-0036: Closed faceted-navigation landings

- Status: Accepted
- Date: 2026-09-13
- Amends: [ADR-0035](0035-technical-seo.md)

## Context

The product list accepts many orthogonal filters (category, brand, type, price,
availability, search, sort, page). Advertising every combination would create
an unbounded set of near-duplicate URLs. ADR-0035 already asked for first-class
category landings; this record defines which catalog URLs may be indexed.

## Decision

1. **Stable landings are path-based and closed.** The only indexable catalog
   URLs are `/catalog`, `/catalog/category/{slug}`, `/catalog/brand/{slug}`, and
   `/catalog/type/{type}` (lowercase `road` / `mtb` / `gravel` / `city` /
   `kids`). Each is self-canonical, has its own title and description, and
   appears in the sitemap. Unknown slugs 404.
2. **A single landing query alias redirects to the path.**
   `/catalog?category=road` (and the brand / type / `bicycleType` equivalents)
   permanently redirect to the landing, preserving only utility query string
   when present.
   Default `page=1` and default sort are stripped the same way.
3. **Everything else is `noindex, follow`.** Two or more landing dimensions,
   search (`q`), price, availability, frame/wheel/spec filters, non-default
   sort, and `page>1` canonicalize to the nearest single landing (the path
   landing if we are on one, otherwise `/catalog`). They are not in the sitemap.
4. **Crawlable links do not multiply.** Facet navigation emits only landing
   paths (one dimension at a time). Search and availability controls use
   `rel="nofollow"`. We do not emit category×brand×type×price URLs.

Indexable catalog URLs grow with categories + brands + 5 types, not with the
cartesian product of facets.

## Alternatives considered

**Index `?category=` query landings.** Rejected: the same page would exist as
both a query and a path, and more query keys would leak into the index.

**`robots.txt` `Disallow: /*?*`.** Rejected: blocked URLs can still appear as
URL-only results. Allowing the crawl and sending `noindex` is the safer
duplicate-control.

**Combinatorial landings for “popular” pairs.** Rejected until there is
evidence a specific pair needs its own document. Adding one pair later is
cheap; removing millions of indexed URLs is not.

## Consequences

- Storefront listing finally applies filters. Category, brand, and type are
  first-class routes under `/catalog`.
- The sitemap lists those landings and published products only.
- Utility result pages remain usable for shoppers and stay out of the index.

## When to revisit

A documented, finite set of two-dimension landings with unique copy. A search
engine or faceted-nav provider. A second language (hreflang on the same closed
set).
