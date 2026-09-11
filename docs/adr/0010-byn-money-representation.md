# ADR-0010: BYN money as integer minor units

- Status: Accepted
- Date: 2026-09-11

## Context

The store prices in Belarusian rubles (BYN), a currency with two decimal places
(100 kopeks to the ruble). Money flows through product prices, cart totals,
VAT, discounts, delivery costs, order records, and payment provider calls — and
must reconcile exactly with what the provider charged and what the customer was
shown.

Whether prices are also displayed in another currency, and how VAT is
presented, remain unresolved business questions.

## Decision

**All monetary amounts are integers in minor units (kopeks), everywhere**: in
the database, in domain code, in interfaces, and in payment provider calls. The
convention is carried in the name: `amountMinor`, `priceMinor`, `costMinor`.

- Database columns are `INTEGER` (or `BIGINT` where overflow is conceivable),
  never `FLOAT`, `REAL`, or `DOUBLE PRECISION`.
- **Floating-point arithmetic on money is prohibited** throughout the codebase.
- Conversion to a display string happens at exactly one place, the `Intl`-based
  formatter in `lib/i18n` (ADR-0009). Domain code never produces a formatted
  price.
- Currency is explicit in interfaces (`currency: "BYN"`) even though only one
  currency exists today, so that adding a second is a type change the compiler
  finds rather than an audit.
- **Rounding is explicit and happens once**, at defined points — VAT
  calculation and percentage discounts — using a documented rounding mode. A
  calculation chain never rounds implicitly at each step.
- Percentage discounts and VAT are computed on the integer minor amount and
  rounded to an integer immediately.

## Alternatives considered

**Floating-point (`number` / `DOUBLE PRECISION`).** Rejected without
reservation. Binary floating point cannot represent 0.1 exactly, so totals
drift by fractions of a kopek and then fail to reconcile with the payment
provider. This is the single most common and most damaging money bug in
ecommerce systems.

**Decimal / `NUMERIC` columns with a decimal library.** Genuinely correct and a
serious alternative, used widely in financial software. Rejected for this store
because it requires a decimal type to be threaded through every layer — ORM
mapping, JSON serialization to the client, and provider calls that themselves
expect integer minor units. Integers are natively correct in all of those
places with no library. The advantage of decimals, exact fractional-unit
precision, is not needed: BYN prices are never quoted below the kopek.

**Strings for money.** Rejected: arithmetic requires parsing anyway, and it
moves type errors to runtime.

**Storing a formatted display string alongside the amount.** Rejected: two
sources of truth that will diverge.

## Reasons

- Integer arithmetic is exact, and exactness is the entire requirement.
- Payment providers overwhelmingly expect integer minor units, so this
  representation matches ADR-0005's interface with no conversion at the
  boundary where mistakes would be most costly.
- PostgreSQL integers (ADR-0003) support it natively with no extension or
  custom type.
- Integers serialize to JSON and cross the server/client boundary without
  precision loss, unlike decimals.
- A `Minor` suffix in every identifier makes a unit mistake visible in review at
  the point of use.

## Consequences

- Every author must remember that `4999` means 49.99 BYN. The naming convention
  is the mitigation, and reviewers should reject any money identifier lacking
  it.
- Any value arriving from outside — a CSV price import, an admin form — must be
  converted to minor units at the boundary, with a single shared parser rather
  than ad-hoc multiplication by 100 (which itself must avoid floating-point
  intermediates).
- Percentage arithmetic requires an explicit rounding decision, which is a
  benefit disguised as a cost: the rounding becomes visible and testable rather
  than accidental. ADR-0008's unit tier covers these cases specifically.
- Displaying prices requires formatting on every render path; a raw integer
  reaching the UI is a visible bug rather than a silent one.
- If a currency without minor units, or with three decimal places, is ever
  added, the exponent becomes a per-currency property rather than the constant
  it is today.

## When to revisit

- A second currency is introduced, requiring per-currency minor-unit exponents
  and an exchange-rate policy — an extension of this decision, not a
  replacement.
- A requirement emerges for sub-kopek precision, such as unit pricing or
  commission splits, which would justify moving to decimals.
- Redenomination or a currency reform in Belarus changes the minor-unit
  structure.

Finding integer arithmetic inconvenient in one calculation is not a trigger.
