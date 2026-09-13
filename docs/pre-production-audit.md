# Pre-production technical audit

Date: 2026-09-13
Repository: `github.com/maksim-sm/bikes`
Audited commit: `647b635` (`cursor/failure-mode-testing-0295`)
Scope: read-only review of architecture, database, inventory, checkout,
payments, delivery, authentication, authorization, admin, SEO, performance,
security, testing, observability, backups, deployment, localization, and
compliance content. No application behaviour was changed in this pull
request.

Companion: ADR-0049. Earlier reviews: `docs/BASELINE.md` (empty-repo
baseline), `docs/security.md` (ASVS L1). This document is the current
go-live gate.

## Verdict

**Not production ready.** Blockers remain. Do not take real customer
orders, card money, or production PII until every BLOCKER below is
closed and this document is amended in the same pull request.

Guest cash-on-delivery on a private staging host is the furthest the
current compose can go without lying to a customer. Even that path is
unsafe on the public internet while the mock payment webhook is live.

## Severity

| Level       | Meaning                                                               |
| ----------- | --------------------------------------------------------------------- |
| **BLOCKER** | Cannot go live. Money, stock, identity, law, or durability is unsafe. |
| **HIGH**    | Will hurt the first production week if ignored.                       |
| **MEDIUM**  | Real gap; not a launch stopper by itself.                             |
| **LOW**     | Debt, polish, or a documented non-goal.                               |

Documented “unresolved” items are still findings when the running code
would ship them.

---

## BLOCKER

### B1. Production compose still uses the mock payment stack

**Area:** payments

`getPaymentServices()` always wires `MockPaymentProvider` and
`createMemoryPaymentRepository`. `createPrismaPaymentRepository` exists
and is used only in integration tests.

Evidence: `src/app/api/_lib/compose.ts` (`sharedPaymentRepository`,
`sharedPaymentProvider`, `getPaymentServices`). Webhook verification
accepts `x-mock-signature: ok`
(`src/modules/payments/infrastructure/mock-provider.ts`).
`POST /api/v1/payments/webhooks` is a public route (`docs/api.md`).

Why it matters: anyone who can POST the webhook can mark an attempt
succeeded. Attempts and refund history die on process restart. No
bePaid / WebPay / ERIP adapter exists. Already listed as priority
finding #1 in `docs/security.md` and open item 1 in
`docs/architecture.md` §16.

### B2. No real email channel

**Area:** notifications / authentication

Production compose uses `createLoggingEmailChannel()` and
`createLoggingMailer()`. Both log a subject and return success. The
outbox row is stored as `SENT` without SMTP.

Evidence: `src/app/api/_lib/compose.ts` `getNotificationServices` and
`getAuthServices`; `src/modules/notifications/infrastructure/email-channel.ts`;
`src/modules/identity/infrastructure/logging-mailer.ts`.
Customers cannot authenticate until `emailVerifiedAt` is set
(`src/modules/identity/domain/auth.ts` `canAuthenticate`).

Why it matters: registration, password reset, and order/payment mail
never reach a mailbox. Guest checkout still places an order; account
self-service and “we emailed you” copy are false.

### B3. Compliance content is not a storefront a Belarus seller can publish

**Area:** localization / compliance

| Expected public surface                    | Status                                        |
| ------------------------------------------ | --------------------------------------------- |
| Privacy policy                             | Stub two paragraphs (`/legal/privacy`)        |
| Terms / public offer (публичная оферта)    | Stub “terms of use”; no offer, no UNP         |
| Returns / consumer cooling-off             | **Missing**                                   |
| Cookie notice                              | **Missing** (session + guest cookies exist)   |
| Seller identity (legal name, UNP, address) | Contacts list a demo street and `bikes.local` |

Evidence: `src/app/legal/` has only `terms` and `privacy`.
`src/lib/i18n/messages/ru.ts` lines 8–9 still call the catalogue
“placeholder structure”. Footer:
`src/app/_shell/site-footer.tsx`. Contacts:
`t.pages.contactsEmail` = `info@bikes.local`. Checkout consent links
only terms + privacy.

Why it matters: distance selling in Belarus requires identifiable
seller, contract terms, and return rules. The current pages are
scaffold copy, not counsel-reviewed text.

### B4. Hosting, staging, and a production seed pipeline are unresolved

**Area:** deployment / database

`docs/architecture.md` §16 items 3–4 and `docs/environments.md` state
that no staging host, managed PostgreSQL, or catalog/staff seed exists
in this repository. Migrations seed **delivery methods**, not products
or users. E2E drives `next dev` and the in-memory demo catalog
(ADR-0039). `NODE_ENV=production` uses Prisma: an empty catalogue and
no staff row.

Why it matters: `pnpm deploy:prepare && pnpm start` on a blank database
is a live empty shop with no admin user unless someone is created
out-of-band. There is no staging artifact check.

### B5. Backup automation and a restore drill are not in the repository

**Area:** backups / database

Scripts exist (`pnpm db:backup`, `pnpm db:restore`, `docs/database.md`).
There is no scheduler, no snapshot of a completed drill, and no
hosting hook. Architecture §15 and `docs/database.md` already call an
untested backup “not a backup” and a restore drill a **release gate
for real orders**.

Why it matters: production orders and customer PII would have no
evidenced recovery path.

---

## HIGH

### H1. Checkout hold reconciler is never invoked

**Area:** inventory / checkout / payments

`createCheckoutHoldReconciler` is exported from compose and covered by
unit tests. No route, cron, or `instrumentation` caller runs
`reconcile()` or `expireDue()`.

Evidence: grep — only `checkout-holds.test.ts` and
`getCheckoutHoldReconciler` in `compose.ts`. ADR-0024: expiry is not
implicit.

Why it matters: unpaid holds stay `ACTIVE` past `expires_at` → ghost
`reserved` (undersell). `/admin/ops` can show
`stale_active_reservation`; nothing heals it.

### H2. Checkout is not one database transaction

**Area:** checkout

`placeOrder` claims the cart, saves the order, then reserves lines
(`src/modules/orders/application/services.ts`). A process crash after
`save` and before `reserve` leaves `PLACED`, an empty cart, and no
hold. `detectOrderAnomalies` does not flag “placed without
reservation”.

Double-click claim and last-unit reserve **are** tested
(`docs/failure-modes.md`). The crash window is not.

### H3. Production media is the local filesystem

**Area:** media / deployment

`createFilesystemMediaStore()` is used in every environment
(`compose.ts`). `MEDIA_DRIVER` is reserved in `.env.example` and unused.
ADR-0007 / architecture §16 item 4 remain open.

Why it matters: uploads vanish on host replace; two instances do not
share bytes.

### H4. Abuse limits are in-process memory

**Area:** security

`createMemoryRateLimiter()` (`src/lib/abuse/memory-rate-limiter.ts`,
`getAbuseLimiter` in compose). Documented in ADR-0042. A second Node
process doubles the budget.

### H5. Unauthenticated payment read

**Area:** payments / security

`GET /api/v1/payments/:id` is `public` and returns `orderId`, status,
and `amountMinor` (`docs/security.md` finding #3).

### H6. Demo passwords remain in source

**Area:** authentication / security

`StaffPass12` / `CustomerPass12` in
`src/modules/identity/application/create-auth.ts`. Production hides
demo buttons and uses Prisma auth, but the constants ship in the
repository. They must never be inserted into the production `users`
table.

### H7. E2E never exercises production compose

**Area:** testing

Playwright uses `next dev` + demo catalog/identity (ADR-0039). It does
not cover: Prisma catalog, `next start`, online payment, webhooks,
admin refund submit, register → verify → login, or filesystem vs
object storage.

Unit + integration (including failure-modes against `bikes_test`) are
strong for domain rules. They do not prove the production wiring in
`compose.ts`.

### H8. Email verification is not rate-limited

**Area:** authentication / security

`verifyEmail` has no abuse gate (`auth-services.ts`). Resend is
limited. Public `POST /api/v1/auth/email/verify`.

### H9. No vendor error sink or log retention

**Area:** observability

JSON stdout + `/admin/ops` (`docs/observability.md`). Acceptable as
the documented non-goal until a host exists; not acceptable as the
only copy of payment/order failures after go-live.

---

## MEDIUM

### M1. Fresh production database has no sellable catalog

Migrations create delivery rows, not brands/products. Admin CRUD can
fill this; there is no `prisma/seed` for launch.

### M2. Storefront checkout is COD / transfer only

`CHECKOUT_PAYMENT_CODES` are `cash_on_delivery`, `card_on_delivery`,
`bank_transfer`. The form never calls `startPayment`. Online pay exists
only as `/api/v1/payments`. Combined with B1, the public API is a mock
acquirer with no UI.

### M3. Existing legal pages are placeholder copy

Even `/legal/terms` and `/legal/privacy` are two short paragraphs and
must be replaced when B3 is closed — not treated as done.

### M4. HTML is `force-dynamic`; no `next/image` or CDN

Catalog queries avoid N+1
(`prisma-catalog-repository.ts`). Media `Cache-Control` is one hour on
`/api/media`. No ISR, no image optimizer. Fine for a small catalog;
weak for a public image-heavy storefront.

### M5. `getOrderRepository()` production stub

Returns the empty in-memory `orderRepo` in production; `getOrderServices()`
correctly uses Prisma. Footgun if a future caller uses the wrong
function (`compose.ts`).

### M6. `compose.ts` reads `process.env` directly

`docs/environments.md` says only `config.ts` should. `NODE_ENV` and
`VITEST` branches in compose bypass that rule.

### M7. Staff cannot change password or use MFA

Documented L2 in `docs/security.md`. Admin is password + idle timeout
only.

### M8. Search is not rate-limited

Catalog FTS is public (`docs/security.md`).

### M9. Architecture §16 is stale in places

Item 5 (admin vs CMS): `/admin` exists. Item 3 still says integration
tests cannot run without hosting; CI already runs PostgreSQL 16
(`docs/ci.md`). Open items 1, 2, 4, 6, 7 remain real.

---

## LOW

| ID  | Area          | Note                                                                                                         |
| --- | ------------- | ------------------------------------------------------------------------------------------------------------ |
| L1  | Checkout      | Pre-reserve `getAvailable` is optimistic; the trigger is authoritative.                                      |
| L2  | Observability | Client-supplied `x-request-id` is accepted.                                                                  |
| L3  | Security      | No global `app/error.tsx`.                                                                                   |
| L4  | Security      | HSTS preload not configured (L2).                                                                            |
| L5  | i18n          | Belarusian locale deferred (ADR-0009) — accepted.                                                            |
| L6  | Delivery      | Staff-entered tracking, no carrier API — accepted (ADR-0006).                                                |
| L7  | Deploy        | `BUILD_ID` optional.                                                                                         |
| L8  | Authorization | `canWriteCustomerResource` treats `read_any_customer` as write; HTTP `customer_only` currently blocks staff. |

---

## Review by topic

### Architecture

Modular monolith, ESLint boundaries, no `app/` → `@/lib/db`, no
`domain/` → `@/lib`, no deep `@/modules/*/*` imports. Production
compose uses Prisma for catalog, cart, inventory, orders, delivery,
identity, media metadata, audit, and notifications. **Payments are the
exception (B1).**

### Database

Prisma 7 + PostgreSQL, forward-only migrations, `pnpm db:verify` /
`db:reproduce` in CI. Policy is sound (ADR-0045). Seed and backup
operations are the gaps (B4, B5, M1).

### Inventory

Race-safe reservation via triggers (ADR-0014). Concurrent last-unit
tests pass. Gaps: unscheduled expiry (H1), crash window (H2).

### Checkout

Server-priced, cart claim, restore on reserve failure
(`docs/checkout.md`, ADR-0048). Money fields from the client are
dropped. Not a single SQL transaction (H2).

### Payments

Port is provider-neutral (ADR-0005). Runtime is mock + memory (B1).
Return URLs do not write status. Duplicate webhooks are idempotent in
tests.

### Delivery

Manual-first, Belarus methods/zones seeded. Production Prisma
repositories. No carrier API — accepted.

### Authentication

Argon2id, hashed cookies, `__Host-` on HTTPS, staff idle timeout.
Customer login requires verified email (B2). Demo secrets in repo (H6).

### Authorization

Route policy + service checks; integration tests for isolation. Admin
layout and per-page capability guards. Latent write helper (L8).

### Admin

Catalog, orders, inventory, audit, ops. `noindex`. Demo login compiled
out of production. No MFA (M7).

### SEO

`robots.ts`, `sitemap.ts`, canonical, closed facet landings, JSON-LD.
Sitemap cannot list returns/cookies/offer pages that do not exist (B3).

### Performance

No critical catalog N+1 found. Caching and image pipeline are minimal
(M4).

### Security

ASVS L1 review in `docs/security.md` still applies. Headers, CSRF on
`/api`, parameterized SQL, upload magic bytes. Blockers B1–B2 dominate.

### Testing

CI gate (ADR-0044): audit, lint/types/unit/integration/build, e2e.
Failure-mode matrix exists (ADR-0048). Production wiring is the hole
(H7).

### Observability

Structured redacted logs, request ids, health/ready, admin ops
anomalies (ADR-0047). No vendor sink (H9).

### Backups and deployment

`docs/deploy.md` + `pnpm deploy:prepare`, `/api/health` vs `/api/ready`.
Hosting unset (B4). Backup scripts without automation or drill (B5).

### Localization

Russian-only, `ru-BY`, BYN kopeks, Minsk time. Copy file still labelled
placeholder (B3, M3).

### Compliance content

See B3. Not lawyer-approved; this audit does not replace legal review.

---

## What is already in good shape

- Boundary ESLint and modular-monolith layout
- Integer BYN, server-side checkout totals
- Inventory triggers + concurrency tests
- Cart claim against double-click
- Argon2id sessions and dual authorization
- Production secret enforcement on `next start`
- Security headers and Origin CSRF on `/api`
- Health vs ready drain
- Required CI stages; no silent skip
- Failure-mode unit/integration coverage of named races
- Faceted SEO without URL explosion

---

## Close-out rule

A later pull request that claims production readiness must:

1. Close every **BLOCKER** with code or an accepted ADR that changes
   the product (for example “COD-only, payment routes disabled”).
2. Re-audit or amend this file with the new commit SHA.
3. Keep residual **HIGH** items listed with an owner.

Until then the verdict stays **not production ready**.
