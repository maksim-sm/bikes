# ADR-0009: Russian-first localization

- Status: Accepted
- Date: 2026-09-11

## Context

The store targets Belarus, where Russian is the dominant commercial language.
Belarusian is an official language and a plausible future addition, but whether
to ship it is an unresolved business decision with no committed date.

This creates the usual trap: build the full multi-locale apparatus now and carry
unused complexity, or hardcode Russian and pay a large, tedious retrofit later.

## Decision

Ship **Russian only**, while preserving the ability to add a locale cheaply. The
decision separates the cheap discipline from the expensive machinery.

Adopted immediately:

1. **No user-facing string is hardcoded in a component.** All copy comes from
   message catalogues in `lib/i18n/messages/<locale>.ts`. This is the single
   rule that determines whether a second locale is feasible later.
2. **Domain modules are locale-agnostic.** Services return codes and structured
   data; `app/` renders them into language. An error from `orders` is a code,
   never a Russian sentence.
3. **Currency, date, and number formatting goes through `Intl` helpers in
   `lib/i18n`**, never string concatenation.
4. **Translatable product content is modelled with a locale column from the
   first migration**, even while only `ru` rows exist.

Deferred until a second locale is actually committed to:

- The `/[locale]/` routing segment. Routing ships without it.
- Locale negotiation, a language switcher, and `hreflang` metadata.
- Any translation management tooling or workflow.

`ru` is the only shipped locale and the fallback.

## Alternatives considered

**Full multi-locale from day one**, with locale routing and a translation
pipeline. Rejected: it adds a URL segment, negotiation logic, and duplicated
routing surface for content that does not exist. Every page and link pays for a
locale that may never ship.

**Hardcode Russian strings in components and extract later.** Rejected, firmly.
String extraction across a grown codebase is the expensive, error-prone part of
adding a language, and it is always done under deadline. Rules 1 and 4 cost
almost nothing now.

**Machine-translate to Belarusian at build time.** Rejected: product
descriptions and legal or returns copy need human accuracy, and bad translation
damages trust more than a single language does.

**Belarusian-first or fully bilingual.** Rejected on commercial grounds: Russian
is where the customers are, and there is no evidence yet that bilingual content
converts better in this market.

## Reasons

- The genuinely expensive part of internationalisation is string extraction and
  schema shape, not routing. We pay for those now, while they are cheap.
- The genuinely speculative part is routing and negotiation machinery, so we do
  not build it.
- A locale column added to an empty catalogue is trivial; added to a populated
  one it is a data migration plus an editorial backfill.
- Keeping language out of domain modules is good design independent of
  localization — it also keeps services usable from background jobs and admin
  tooling.

## Consequences

- A small, constant overhead on every piece of UI work: copy goes in a
  catalogue rather than inline. This must be enforced in review, because it is
  the rule most likely to erode.
- The catalogue's locale column is unused ballast in queries until a second
  locale exists.
- Adding Belarusian later still requires the routing work and a real translation
  effort. The decision reduces that cost; it does not eliminate it.
- Pluralisation in Russian has three forms, so the message catalogue format must
  support plural rules from the start even with one language.
- Cyrillic slugs, search, and sorting must be handled correctly; PostgreSQL's
  Russian text-search configuration (ADR-0003) covers the search part.

## When to revisit

- The business commits to serving Belarusian, which is the expected trigger and
  activates the deferred routing work.
- Expansion to a neighbouring market requires another language.
- Legal or procurement requirements mandate Belarusian-language content.

A general desire to "be multilingual" without a committed locale is not a
trigger; that is precisely what this decision defers.
