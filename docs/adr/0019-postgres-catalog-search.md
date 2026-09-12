# ADR-0019: Indexed PostgreSQL catalogue search

- Status: Accepted
- Date: 2026-09-12
- Supersedes: the “`q` is ILIKE for now” clause of
  [ADR-0018](0018-postgres-catalog-listing.md)

## Context

Listing already filtered in PostgreSQL. Search still used unindexed
`ILIKE` on product and brand name, missed SKUs, and would invite per-row
lookups if someone joined variants in a loop.

## Decision

1. **Stay in PostgreSQL.** No Elasticsearch.
2. **Store one search document per product** (`products.search_text`): brand
   name, model name/slug, description, typed specs, and variant SKU / colour /
   sizes. Triggers refresh it when those tables change.
3. **Index it twice:** a generated `tsvector` (`simple` config — brands and
   SKUs must not be stemmed) with a **GIN** index, and a **pg_trgm GIN** index
   on `search_text` for partial SKU / model matches.
4. **One search query, one hydrate query.** `q` resolves matching product ids
   (and rank) in a single `SELECT`. The page is loaded with `findMany` +
   `include` for brand, category, and variants. Do not query variants per
   product.

`websearch_to_tsquery` plus `ILIKE` on the same document covers phrase search
and substring SKUs. Default sort with `q` is `relevance` (`ts_rank_cd`).

## When to revisit

If Russian stemming on descriptions becomes important, add a second weighted
vector with the `russian` config. Do not add a search cluster until GIN +
trigram are proven insufficient on a realistic catalogue.
