# ADR-0039: Playwright journeys against the demo stack

- Status: Accepted
- Date: 2026-09-13
- Amends: [ADR-0008](0008-testing-strategy.md)

## Context

ADR-0008 reserved Playwright for browse, cart, and checkout against the mock
payment provider, and said end-to-end runs against a built application. The
storefront now also has search, variant selection, account order history,
wishlist, and staff order processing. Those journeys still need a browser.

`next start` always sets `NODE_ENV=production`. Compose then reads empty
PostgreSQL instead of the in-memory demo catalog, identity, cart, orders, and
payment fixture. Demo login buttons are compiled out of the client bundle. A
production build on `http://localhost` would also set Secure session cookies
that Playwright cannot store. There is no seed pipeline yet that would make a
built app exercisable.

Demo cart, inventory, and orders are process-global singletons. Parallel
Playwright workers would share one cart and the four units of Émonda M / чёрный.

## Decision

Critical journeys are covered by Playwright under `tests/e2e/`.

Binding rules:

1. **The suite starts `next dev` on port 3100.** That is the only mode that
   serves the demo catalog, demo customer/staff login, seeded order
   `B-20260912-0001`, and the cash-on-delivery payment fixture.
2. **Workers stay at 1** (`fullyParallel: false`). Shared in-memory stock and
   carts are not isolated between files.
3. **Selectors use Russian accessible names** from `src/lib/i18n/messages/ru.ts`,
   not `data-testid` attributes.
4. **Chromium covers the purchase, account, and admin journeys.** Pixel 5 covers
   the phone layout: main catalog nav is hidden below 768px; brand, account, and
   cart stay visible; catalog is reached by URL.
5. **`pnpm check` does not run Playwright.** Browsers are not part of the unit
   and integration gate. CI runs `pnpm test:e2e` as a second job after installing
   Chromium.

Journeys in the suite: browse catalog, search, select size and color, add to
cart, checkout, cash payment fixture, order confirmation, account order history,
wishlist, and admin notes on the seeded paid order.

## Alternatives considered

**`next start` plus `BIKES_DEMO_STACK`.** Rejected for now: it needs a public
env flag baked into the client bundle, Secure-cookie exceptions, and the same
in-memory singletons. That is a seed-and-cutover change, not an E2E setup
change.

**Seed PostgreSQL and keep ADR-0008's built-app rule.** Correct long-term.
Rejected today because there is no seed script and production compose has no
demo users.

**Many Playwright workers.** Rejected while compose shares one inventory and
cart in the demo process.

## Consequences

- Local `pnpm test:e2e` downloads Chromium once (`pnpm test:e2e:install`) and
  starts a second Next server on 3100 so it does not collide with `pnpm dev` on 3000.
- A production-mode regression (empty catalog, Secure cookies, missing demo
  login) is not caught by this suite. That stays a compose/seed problem.
- Checkout places at most one real demo order per run so the four-unit M /
  чёрный stock is not exhausted.

## When to revisit

- A seed pipeline and production compose can serve the same journeys from
  PostgreSQL. Then the webServer should switch to `next build && next start`
  and this ADR should be superseded.
- Demo state is isolated per worker (separate processes or per-test fixtures).
  Then `workers: 1` can be relaxed.
