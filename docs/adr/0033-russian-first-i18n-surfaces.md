# ADR-0033: Localization surfaces and Minsk-aware formatting

- Status: Accepted (amended by [ADR-0034](0034-transactional-notification-outbox.md))
- Date: 2026-09-13
- Amends: [ADR-0009](0009-russian-first-i18n.md)

## Context

ADR-0009 put UI chrome in `lib/i18n/messages/ru.ts` and required `Intl` for
money and dates. After the storefront and admin console landed, three gaps
remained: dates used the process timezone (UTC in production), Russian
plurals were a suffix glued onto a number, and emails, HTTP errors, Zod
failures, and notifications still leaked English or raw domain messages.

## Decision

1. **One locale registry.** `localeMeta` records BCP-47 (`ru-BY`), currency
   (`BYN`), and `Europe/Minsk`. A second language is a registry row plus a
   catalogue that satisfies `Messages`. Routing stays without `/[locale]/`.
2. **Formatting helpers are the only display path** for money, numbers,
   dates, and plurals. `formatStoreDateTime` always shows Minsk time and a
   zone label. `formatPlural` uses `Intl.PluralRules` (`one` / `few` /
   `many`; `other` maps to `many`).
3. **Every customer-facing surface has a catalogue:** UI, validation, HTTP
   system codes, emails, in-app notifications, and metadata. Domain services
   still throw codes, not sentences.
4. **HTTP `error.message` is localized by `AppError.code`.** Stack text and
   English domain messages never cross the envelope. Codes stay stable
   English identifiers.
5. **Mail is rendered from the catalogue.** The development mailer logs
   subject and recipient, never the raw token.

## Alternatives considered

**Keep English HTTP messages as a machine API.** Rejected for this store:
the JSON API is used by the same Russian storefront, and `code` already
gives clients a stable handle.

**ICU message files.** Rejected as tooling we do not have. TypeScript
catalogues plus `Intl` cover plurals and interpolation without a pipeline.

**Process-local dates.** Rejected: a UTC host would show the wrong civil
time to Minsk customers.

## Consequences

- Adding Belarusian is translation work, not extraction work, but still
  requires a committed catalogue and a later routing change.
- Tests must assert codes and catalogue strings, not English leftovers
  like `"internal error"`.

## When to revisit

- The business commits to Belarusian (the trigger already named in ADR-0009).
- A second timezone appears (then zone is no longer 1:1 with locale).
