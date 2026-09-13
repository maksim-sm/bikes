# ADR-0037: Measure before adding a cache or search tier

- Status: Accepted
- Date: 2026-09-13
- Confirms: [ADR-0003](0003-postgresql.md), [ADR-0018](0018-postgres-catalog-listing.md), [ADR-0019](0019-postgres-catalog-search.md)
- Amends: none

## Context

Ecommerce checklists often start with Redis and Elasticsearch. This store's
architecture already forbids a cache tier and a second search engine until a
measured problem demands one. Prompt 21.1 asked for Core Web Vitals, images,
queries, client JS, caching, and pagination — with measurements first.

On this machine, production HTML TTFB for `/catalog` was ~10–18 ms. Gzipped
catalog HTML is ~5.5 KB. Media placeholders are 678 B. Listing SQL is batched
`include`s, not per-product N+1. The expensive mistakes were **duplicate
loaders** on one request, **unsized images**, a **1-hour media cache**, and
**no storefront pagination UI**.

## Decision

1. **Do not add Redis, a page cache, or a search engine in this change.**
2. **Fix what the measurements showed**, in process:
   - `cache()` around `loadProductPage` and catalog taxonomy so metadata and
     the page share one read;
   - intrinsic size + `fetchpriority` on `MediaImage`;
   - 24-hour media `Cache-Control` with `stale-while-revalidate`;
   - storefront prev/next at 24 items per page (`rel="nofollow"`, noindex).
3. **Keep listing in PostgreSQL.** A thinner list projection is the next
   database change if a page of 24 products starts hydrating huge graphs.

## Alternatives considered

**Redis for catalog HTML.** Rejected: TTFB is already low, and the header
reads the session cookie on every public page, so a shared page cache would
be wrong or mostly empty.

**Next.js image optimizer.** Rejected for now: media keys are opaque
(ADR-0007). Width/height on `<img>` plus `sizes` is enough for CLS/LCP
without sending keys through `/_next/image`.

**Elasticsearch.** Already rejected in ADR-0018/0019. Search is GIN + trigram.

## Consequences

- `docs/performance.md` is the living scorecard. Update it when you re-measure.
- Adding Redis or a search engine requires a new ADR that cites a regression
  against those numbers.

## When to revisit

See the last section of `docs/performance.md`.
