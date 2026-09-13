# Release candidate review

Date: 2026-09-13
Repository: `github.com/maksim-sm/bikes`
Reviewed commit: `9ad77d5` (`main` after merging the ops, domain-test,
and performance stacks)
Companion: ADR-0050. Prior gate: `docs/pre-production-audit.md`
(ADR-0049, audited `647b635`).

This review compares the running compose and the test evidence against
`docs/architecture.md`, the ADR set, `prisma/schema.prisma`, the
automated suites, `docs/security.md`, `docs/payments.md`, and a
synthesized Belarus launch view. **There is no standalone Belarus
launch checklist file** in the repository; section 13 lists the items
that still need business/legal confirmation.

**Critical rule applied:** a successful production build is not
readiness. The shop is ready only when critical customer, payment,
inventory, security, operational, and deployment paths have
evidence-backed validation.

---

## Command evidence (this review)

| Check                        | Command / equivalent                                | Result                                                                                                                                         |
| ---------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Test inventory               | `pnpm ci:assert-tests`                              | Pass. 76 unit, 8 integration, 5 e2e files; no skipped tests.                                                                                   |
| Lint (repo sources)          | `eslint` on `src`, `scripts`, `tests`, config files | Pass.                                                                                                                                          |
| Lint (`pnpm lint` / `check`) | `eslint .` before ignore fix                        | Fail after a local E2E run: ESLint walked `.next-e2e/**` (18 301 problems). CI is clean because those artifacts are absent.                    |
| Format                       | `pnpm format:check`                                 | Pass.                                                                                                                                          |
| Typecheck                    | `pnpm db:generate && pnpm typecheck`                | Pass.                                                                                                                                          |
| Unit                         | `pnpm test:unit`                                    | Pass. **305** tests, 76 files.                                                                                                                 |
| Integration                  | `pnpm test:integration`                             | Pass. **22** tests, 8 files (`bikes_test`).                                                                                                    |
| E2E                          | `pnpm test:e2e:install && pnpm test:e2e`            | Pass. **6** Playwright tests (5 Chromium + 1 Pixel 5). Suite drives `next dev` on port 3100 (ADR-0039).                                        |
| Production build             | `pnpm build`                                        | Pass (Next.js 16.3.4). Warnings: middleware → proxy deprecation; `instrumentation.ts` `process.exit` flagged as unsupported on Edge.           |
| Migration reproduce          | `pnpm db:reproduce`                                 | Pass. 23 forward migrations on throwaway `bikes_reproduce`.                                                                                    |
| Migration verify (this VM)   | `pnpm db:verify`                                    | Fail: Prisma P3009, failed migration `20260912061000_catalog_browse_filters` on the local `bikes` database. **Local dirt, not a repo defect.** |
| Dependencies                 | `pnpm audit:deps`                                   | Pass with documented exceptions: `GHSA-ggr8-5vv4-36mx` (deepmerge-ts), `GHSA-3f6p-5ww8-9rcr` (mysql2).                                         |

`pnpm check` as a single script was not all-green on this agent VM
because of (1) `eslint .` vs `.next-e2e` before the ignore fix in this
PR, and (2) `db:verify` against a dirty developer database. The
CI-equivalent pieces that matter for the artifact — source lint,
types, unit, integration, reproduce, build, dep audit, E2E — passed.

---

## 1. Executive readiness verdict

**Not ready for commercial production.**

The modular monolith, domain tests, inventory triggers, server-priced
checkout, ASVS L1 controls, CI gate, and demo E2E journeys are in
good shape for a **private staging / COD-only rehearsal** on a host
that never exposes the mock payment webhook to the public internet.

They are **not** evidence that a Belarusian merchant can take real
customer money, send real mail, publish a lawful offer, recover the
database, or operate Prisma-backed catalog and identity in production.

Guest cash-on-delivery on a private staging host remains the furthest
the current compose can go without lying to a customer. Even that path
is unsafe on the public internet while `POST /api/v1/payments/webhooks`
accepts `x-mock-signature: ok`.

---

## 2. Blockers

Unchanged from ADR-0049; re-confirmed in `src/app/api/_lib/compose.ts`
at `9ad77d5`.

### B1. Production compose still uses the mock payment stack

`getPaymentServices()` always wires `MockPaymentProvider` and
`createMemoryPaymentRepository`. `createPrismaPaymentRepository` exists
and is used only in tests. Webhook verification accepts
`x-mock-signature: ok`
(`src/modules/payments/infrastructure/mock-provider.ts`).
`POST /api/v1/payments/webhooks` is a public route.

Anyone who can POST the webhook can mark an attempt succeeded. Attempts
and refund history die on process restart. No bePaid / WebPay / ERIP
adapter exists (`docs/payments.md`, architecture §16 item 1).

### B2. No real email channel

Production compose uses `createLoggingEmailChannel()` and
`createLoggingMailer()`. The outbox row is stored as `SENT` without
SMTP. Customers cannot authenticate until `emailVerifiedAt` is set
(`canAuthenticate`). Registration, password reset, and order mail never
reach a mailbox.

### B3. Compliance content is not a publishable Belarus storefront

| Expected public surface                    | Status                                  |
| ------------------------------------------ | --------------------------------------- |
| Privacy policy                             | Stub (`/legal/privacy`)                 |
| Terms / public offer (публичная оферта)    | Stub; no offer, no UNP                  |
| Returns / consumer cooling-off             | Missing                                 |
| Cookie notice                              | Missing (session + guest cookies exist) |
| Seller identity (legal name, UNP, address) | Demo street and `info@bikes.local`      |

### B4. Hosting, staging, and a production seed pipeline are unresolved

Architecture §16 items 3–4 and `docs/environments.md`: no staging host,
managed PostgreSQL, or catalog/staff seed in this repository.
Migrations seed delivery methods, not products or users. E2E uses
`next dev` + the in-memory demo catalog. `NODE_ENV=production` uses
Prisma: empty catalogue, no staff row.

### B5. Backup automation and a restore drill are not evidenced

`pnpm db:backup` / `pnpm db:restore` exist. There is no scheduler, no
hosting hook, and no recorded restore drill. Architecture §15 already
calls an untested backup “not a backup” and a restore drill a **release
gate for real orders**.

---

## 3. High-risk issues

| ID  | Area                  | Finding                                                                                                                                         |
| --- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | Inventory / checkout  | `createCheckoutHoldReconciler` is exported and unit-tested; nothing in a route, cron, or `instrumentation` calls `reconcile()` / `expireDue()`. |
| H2  | Checkout              | `placeOrder` is not one database transaction: claim cart → save order → reserve. Crash after save leaves `PLACED`, empty cart, no hold.         |
| H3  | Media                 | `createFilesystemMediaStore()` in every environment. `MEDIA_DRIVER` is unused. ADR-0007 remains open.                                           |
| H4  | Abuse                 | In-process rate limits (ADR-0042). A second Node process doubles the budget.                                                                    |
| H5  | Payments / security   | `GET /api/v1/payments/:id` is public and returns `orderId`, status, `amountMinor`.                                                              |
| H6  | Auth                  | `StaffPass12` / `CustomerPass12` remain in source. Must never be inserted into production `users`.                                              |
| H7  | Testing               | Playwright never exercises production compose: Prisma catalog, `next start`, online pay, webhooks, refund submit, register → verify → login.    |
| H8  | Auth                  | `verifyEmail` is not rate-limited. Public `POST /api/v1/auth/email/verify`.                                                                     |
| H9  | Observability         | JSON stdout + `/admin/ops` only. No vendor sink or evidenced log retention.                                                                     |
| H10 | Tooling (this review) | `eslint .` previously linted Playwright dist dirs. Fixed in this PR by ignoring `.next-e2e/**` and `.next-headers/**`.                          |

---

## 4. Medium-risk issues

| ID  | Finding                                                                                                                                   |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| M1  | Fresh production database has no sellable catalog (`prisma/seed` absent).                                                                 |
| M2  | Storefront checkout is COD / transfer only (`cash_on_delivery`, `card_on_delivery`, `bank_transfer`). Online pay exists only as HTTP API. |
| M3  | Existing `/legal/terms` and `/legal/privacy` are placeholder paragraphs.                                                                  |
| M4  | HTML is `force-dynamic`; no `next/image` / CDN. Catalog queries avoid N+1; image pipeline is weak.                                        |
| M5  | `getOrderRepository()` production stub vs Prisma in `getOrderServices()` — footgun.                                                       |
| M6  | `compose.ts` reads `process.env` directly; `docs/environments.md` says only `config.ts` should.                                           |
| M7  | Staff cannot change password or use MFA (ASVS L2).                                                                                        |
| M8  | Public catalog FTS is not rate-limited.                                                                                                   |
| M9  | Architecture §16 is stale: item 5 (admin exists); item 3 still claims integration tests cannot run (CI already runs PostgreSQL 16).       |
| M10 | Build warnings: Next.js middleware deprecation; `instrumentation.ts` `process.exit` Edge warning.                                         |

---

## 5. Low-risk issues

| ID  | Note                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------ |
| L1  | Pre-reserve `getAvailable` is optimistic; the DB trigger is authoritative.                                   |
| L2  | Client-supplied `x-request-id` is accepted.                                                                  |
| L3  | No global `app/error.tsx`.                                                                                   |
| L4  | HSTS preload not configured (L2).                                                                            |
| L5  | Belarusian locale deferred (ADR-0009) — accepted technically; still a legal/business question (section 13).  |
| L6  | Staff-entered tracking, no carrier API — accepted (ADR-0006).                                                |
| L7  | `BUILD_ID` optional.                                                                                         |
| L8  | `canWriteCustomerResource` treats `read_any_customer` as write; HTTP `customer_only` currently blocks staff. |
| L9  | Copy file still describes “placeholder structure” in places.                                                 |

---

## 6. Missing tests

Present and useful: domain + failure-mode unit tests, Prisma integration
on `bikes_test` (including payment repository and inventory races),
Playwright demo journeys (guest COD, account/wishlist, admin notes,
security headers, mobile checkout path).

Still missing as **evidence of production compose**:

1. `next start` + Prisma catalog browse/search/PDP against a seeded DB.
2. Register → email verify → login with a real (or captured) mailer.
3. Provider webhook with a non-mock signature and durable payment rows.
4. Hold reconciler / `expireDue` as a scheduled job.
5. Crash/restart after `placeOrder` save and before reserve (H2).
6. Admin refund submit against Prisma payments.
7. Backup → restore → `db:verify` drill recorded as an artifact.
8. Multi-instance rate-limit / session behaviour.
9. Object-storage media round-trip.
10. Staging smoke of `/api/health` vs `/api/ready` drain on a real host.

---

## 7. Security findings

ASVS 5.0 L1 checklist in `docs/security.md` still applies.

**Already in good shape:** parameterized Prisma (including FTS), Argon2id,
hashed sessions, `__Host-` cookies on HTTPS, Origin CSRF on `/api`
mutations, dual authorization, upload magic bytes, generic API errors,
audit redaction, document security headers (E2E-covered).

**Open L1 / launch impact:**

- Mock webhook is an unauthenticated money-state write (B1, priority #1).
- Demo passwords in source (H6, priority #2).
- Unauthenticated payment read (H5, priority #3).
- In-process abuse limits (H4).
- Unrate-limited email verify (H8).
- Logging-only mail still marks outbox `SENT` (B2).
- Production secrets are enforced on `next start`; that does not fix
  compose wiring.

Documented dependency exceptions (`audit:deps`) are accepted in-repo;
they are not a substitute for a live provider or SMTP.

---

## 8. Payment findings

The port matches ADR-0005 / ADR-0022–0024: six methods, integer kopeks,
return URLs do not write status, duplicate webhooks are idempotent in
tests, failure releases holds in unit/integration tests.

The **runtime** does not match a commercial acquirer:

- Provider name is `"mock"`; Prisma `Payment` persistence is unused at
  runtime.
- Storefront never calls `startPayment` (M2).
- Public webhook + `x-mock-signature: ok` is a forgeable success path.
- No merchant-account adapter, no production webhook secret, no
  settlement/reconciliation job.

Until B1 is closed (or payment HTTP routes are disabled by ADR), do not
take card or ERIP money.

---

## 9. Inventory / order correctness findings

**Sound, evidenced:** race-safe reservation triggers (ADR-0014);
concurrent last-unit tests; cart `claimForCheckout` against double-click
(ADR-0048); server-authoritative totals; independent order / payment /
fulfillment statuses (ADR-0013); Belarus delivery methods/zones seeded
(ADR-0025).

**Not evidenced in production wiring:**

- Hold expiry is not scheduled (H1) → ghost `reserved` / undersell.
- Checkout crash window (H2) → `PLACED` without reservation.
- Payment success via forged webhook can desynchronize money vs stock
  (B1).
- Demo inventory is process-global; Playwright is sequential for that
  reason and does not prove Prisma stock under `next start`.

---

## 10. Performance findings

`docs/performance.md` / ADR-0037: measure before Redis or a search
engine. Catalog listing avoids N+1. Almost all routes are dynamic;
`/robots.txt` is static. No ISR, no image optimizer, filesystem media.

Acceptable for a small catalog on a single instance. Not characterized
for a public image-heavy storefront or a second app process. Do not add
Redis to “look production-ready.”

---

## 11. SEO findings

ADR-0035 / ADR-0036 / `docs/seo.md`: canonical, closed facet landings,
JSON-LD, `robots.ts`, `sitemap.ts`, admin/`account`/`checkout` `noindex`.

Gaps: sitemap cannot list returns, cookies, or a real public offer
(B3). Production catalog sitemap is empty until products exist (B4/M1).
Placeholder legal copy is indexable if the site is public. `metadataBase`
depends on a real `APP_URL`.

---

## 12. Deployment findings

Present: `docs/deploy.md`, `pnpm deploy:prepare`, `/api/health` vs
`/api/ready`, four-environment policy (ADR-0043), required CI stages
(ADR-0044), forward-only migrations (ADR-0045), reproduce script.

Absent or unproven: hosting target, managed PostgreSQL, staging
artifact check, production seed, object storage, automated backups,
restore drill, log sink, hold reconciler schedule, SMTP, payment
secrets.

`db:reproduce` is the CI-equivalent migration proof. A dirty local
`db:verify` (P3009) is an operator hygiene issue, not a missing
migration in git.

Architecture §16 item 3 is outdated: integration tests already run in
CI. Hosting is still unresolved as a **production** blocker (B4).

---

## 13. Belarus compliance items requiring business/legal confirmation

These are **not** engineering sign-off. Counsel and the merchant must
confirm before a public launch.

1. **Seller identity** — legal name, UNP, registered address, contact
   phone/email (not `bikes.local`).
2. **Публичная оферта** — distance-selling contract terms, price
   formation, delivery, payment methods, liability.
3. **Returns / consumer rights** — cooling-off, warranty, defect vs
   change-of-mind, who pays return shipping.
4. **Personal data** — privacy policy aligned with Belarus personal-data
   rules; processing grounds; retention; cross-border hosting if the
   VPS is outside BY.
5. **Cookies / sessions** — notice and any required consent for
   non-essential cookies.
6. **VAT / tax presentation** — architecture §16 item 6 is unset
   (ADR-0010 only fixes kopeks).
7. **Payment institution** — bePaid vs WebPay vs ERIP (or COD-only);
   merchant agreement; receipt / кассовый requirements if applicable.
8. **Delivery rates and carrier** — demo zone table is not a published
   tariff (ADR-0025).
9. **Language** — Russian-only is an accepted product decision
   (ADR-0009); whether Belarusian must appear on a public shop is a
   legal/business call, not a closed engineering one.
10. **Transactional email** — “we emailed you” copy is currently false
    (B2); official notices cannot rely on stdout.
11. **Advertising / marketplace claims** — catalog still carries
    placeholder framing in i18n; do not advertise live stock or
    prices until the production seed is real.

This review does not replace legal advice.

---

## 14. Exact recommended next actions

Do these in order. Do not start taking public orders in parallel.

1. **Decide the first live payment shape**
   - Either: pick bePaid / WebPay / ERIP, implement the adapter, persist
     with `createPrismaPaymentRepository`, replace mock webhook
     verification, and remove `x-mock-signature: ok` from production.
   - Or: ADR that the public shop is COD/transfer only and **disable**
     `POST /api/v1/payments/webhooks` and `GET /api/v1/payments/:id` in
     production until a provider exists.
2. **Wire a real SMTP (or transactional) channel** and stop marking
   outbox `SENT` on log-only success. Prove register → verify → login
   on staging.
3. **Replace legal stubs** with counsel-reviewed offer, privacy,
   returns, cookie notice, and UNP/contacts. Link them from footer and
   checkout.
4. **Provision staging + production** (architecture §16 item 3):
   managed PostgreSQL, secrets, HTTPS `APP_URL`, object storage
   (ADR-0007), and a **seed runbook** for catalog + first staff user
   (never demo passwords).
5. **Schedule hold reconciliation** (`expireDue` / `reconcile`) and
   close or explicitly accept the `placeOrder` crash window (H1–H2).
6. **Run and record a backup restore drill** against a copy of staging;
   attach the artifact to `docs/database.md`. Automate nightly dumps.
7. **Add production-compose E2E or staging smoke**: `next start`, Prisma
   catalog, health/ready, and the chosen payment path.
8. **Harden remaining L1 gaps** that survive the payment decision:
   authenticate or remove public payment GET; rate-limit email verify;
   plan multi-instance abuse limits before a second process.
9. **Amend this file and `docs/pre-production-audit.md` with the new
   SHA** only after B1–B5 are closed. Until then the verdict stays
   **not production ready**.

---

## What is already in good shape

- Modular-monolith ESLint boundaries; `app/` does not import `@/lib/db`;
  domain stays pure.
- Integer BYN; server-side checkout totals.
- Inventory triggers + concurrency tests; cart claim; failure-mode
  matrix (ADR-0048).
- Argon2id sessions; dual authorization; security headers; production
  secret enforcement on `next start`.
- Health vs ready drain; required CI stages; no silent skip.
- Faceted SEO without URL explosion; Russian-first i18n surfaces.
- 305 unit + 22 integration + 6 E2E tests green on this review.

---

## Close-out rule

A later pull request that claims commercial production readiness must:

1. Close every **BLOCKER** with code or an accepted ADR that changes
   the product.
2. Re-audit or amend this file and `docs/pre-production-audit.md` with
   the new commit SHA.
3. Keep residual **HIGH** items listed with an owner.

Until then the verdict stays **not production ready**.
