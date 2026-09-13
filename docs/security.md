# Security — OWASP ASVS 5.0 checklist

Status: code review of the running application as of 2026-09-13. Decision:
ADR-0040. Companion to `docs/architecture.md` §14, `docs/auth.md`,
`docs/api.md`, and `docs/admin.md`.

This is **not** a certified ASVS assessment. It is a requirement-mapped review
of the storefront, `/api/v1`, admin console, and payment callback surface.
Identifiers use the ASVS 5.0.0 form `v5.0.0-<chapter>.<section>.<id>` (for
example `v5.0.0-1.2.4`).

## Target level

| Level  | Meaning here                                                                                      |
| ------ | ------------------------------------------------------------------------------------------------- |
| **L1** | Current bar. A public bicycle shop that does not store card data.                                 |
| **L2** | Next bar for staff and for any live payment provider. MFA, HSTS preload, distributed rate limits. |
| **L3** | Out of scope. Hardware authenticators, field-level adaptive auth.                                 |

Chapters that do not apply: **V9** (self-contained tokens / JWT), **V10**
(OAuth / OIDC), **V17** (WebRTC). The app uses opaque hashed sessions and no
federation.

## Status legend

| Status      | Meaning                                                     |
| ----------- | ----------------------------------------------------------- |
| **Met**     | Implemented in this repository and matches the requirement. |
| **Partial** | A real control exists; a documented gap remains.            |
| **Gap**     | L1 (or an architecture claim) is not met.                   |
| **L2+**     | Required only from L2 or L3; recorded, not blocking L1.     |
| **N/A**     | Control does not apply to this application.                 |

## Priority findings

Ordered by impact if this build were exposed on the public internet.

1. **Payment compose always uses the mock provider** (`v5.0.0-2.3.1`,
   `v5.0.0-8.2.1`). `getPaymentServices()` in
   `src/app/api/_lib/compose.ts` wires `MockPaymentProvider` and an in-memory
   repository in every environment. `createPrismaPaymentRepository` is never
   called at runtime. `POST /api/v1/payments/webhooks` accepts
   `x-mock-signature: ok`. A live provider must replace this before any real
   money moves.
2. **Demo passwords live in source** (`v5.0.0-6.3.2`, `v5.0.0-13` secrets).
   `StaffPass12` / `CustomerPass12` are compiled constants. Demo login buttons
   are compiled out of production, but `createDemoAuthServices()` still seeds
   those users whenever `NODE_ENV !== "production"`.
3. **Public payment status by id** (`v5.0.0-8.2.2`).
   `GET /api/v1/payments/:id` is `public` and returns `orderId`, status, and
   amount. UUIDs reduce guessability; it is still an unauthenticated object
   read.

Closed in ADR-0041: document CSP with a per-request nonce, HSTS on https,
`nosniff` / frame / referrer / permissions headers, `__Host-` cookies,
JSON-LD `\u003c` escaping, and production startup failure when
`DATABASE_URL`, https `APP_URL`, or `AUTH_SECRET` is missing.

Closed in ADR-0042: shared `src/lib/abuse` limiter on login, register,
password reset, admin login, checkout, payment start, and webhooks. HTML
actions key by IP. Limits stay in-process until a second instance exists.

What is already in good shape: parameterized Prisma (including catalog FTS),
Argon2id at OWASP parameters, hashed session tokens, Origin CSRF on `/api`
mutations, dual authorization (route policy + service ownership), media
magic-byte uploads, generic API errors, audit payload redaction.

---

## Review by topic

### Injection — V1.2, V1.3, V1.5

Prisma typed queries are the default. The two production `$queryRaw` sites
bind parameters: catalog FTS / ILIKE in
`src/modules/catalog/infrastructure/prisma-catalog-repository.ts` (ILIKE
escaped via `escapeIlike`), and `expire_inventory_reservations($1)` in
inventory. Sort fields are allow-listed at the HTTP boundary, not interpolated
as identifiers from the query string.

No `eval`, `exec`, or OS command surface in `src/`. LDAP, XPath, and XXE
parsers are absent. JSON bodies go through Zod (`parseWithSchema`); there is
no XML ingest.

`websearch_to_tsquery('simple', $1)` can throw on odd syntax. That is a
reliability issue, not SQL injection.

### XSS — V1.2.1–1.2.3, V3.2, V3.4

Storefront copy is React text. Product descriptions are not rendered as HTML.
SVG placeholders XML-escape text. The only `dangerouslySetInnerHTML` is
JSON-LD. No WYSIWYG sanitizer is required today because there is no rich text
(`v5.0.0-1.3.1` N/A).

`src/middleware.ts` sets a per-request CSP (`object-src 'none'`,
`base-uri 'none'`, `frame-ancestors 'none'`, nonce + `'strict-dynamic'`),
`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin`, and `Permissions-Policy`.
JSON-LD scripts take the request nonce. Media GET also sets `nosniff`.
The CSP does not allow third-party script hosts.

### CSRF — V3.3.2, V3.5.1–3.5.3

`withRoute` calls `assertSameOrigin` on every non-GET/HEAD `/api` request
unless `{ csrf: false }`. The only exemptions are the payment webhook (provider
signature) and a GET payment return. Missing `Origin` is a 403.

Server actions have no application token. They rely on Next.js origin checks
plus `SameSite=Lax`. Architecture §14’s “mutations are CSRF-protected” is true
for `/api`; it is framework-only for `"use server"` forms.

Unsafe methods are used for mutations. GET does not change commerce state
except `observeReturn`, which polls the provider and must not be CSRF-gated
(browser return).

### Authentication — V6

| Control                                         | Evidence                                               |
| ----------------------------------------------- | ------------------------------------------------------ |
| Argon2id, m=19 MiB, t=2, p=1                    | `src/modules/identity/infrastructure/argon2-hasher.ts` |
| Dummy hash on unknown email                     | `auth-services.ts` `login`                             |
| Opaque register / forgot / resend               | same file                                              |
| Email verify before customer login              | `canAuthenticate`                                      |
| Length 10–128, no composition rules             | `assertPasswordPolicy` — matches `v5.0.0-6.2.5`        |
| Customer password change needs current password | `changePassword`, account UI                           |
| No secret questions                             | none in schema                                         |
| In-process limiter, 5 / 15 min                  | `createMemoryRateLimiter`                              |

Gaps: no MFA (`v5.0.0-6.3.3` is L2); no breached-password list; no
context-specific banned words; staff cannot change password or logout-all
(`requireCustomer`); `verifyEmail` is not rate-limited; demo accounts in
non-production.

### Session security — V7, V3.3

Lucia/Oslo pattern: 32-byte CSPRNG token, SHA-256 digest in `auth_sessions`.
Cookie `bikes_session` on http, `__Host-bikes_session` on https: httpOnly,
SameSite=Lax, `Secure` + `Path=/` + no `Domain` when production or https
`APP_URL`. Guest carts use `bikes_guest` / `__Host-bikes_guest` with an
HMAC-SHA-256 of `AUTH_SECRET`. New session on login. Logout and password
reset revoke backend rows.

Customer: 14-day absolute, no idle timeout (documented). Staff: 12-hour
absolute, 30-minute idle, `lastSeenAt` on `resolve` (ADR-0029).

Gaps: no documented concurrent-session cap; no admin UI to revoke another
user’s sessions; customer logout-all exists, staff does not.

### Authorization and access control — V8

Documented in `docs/auth.md` and `docs/api.md`. Coarse gate is
`withRoute(policy)`. Ownership is `assertCanReadOrder`,
`assertCanReadCustomerResource`, `assertCanWriteCustomerResource`. Admin
pages call `requireAdminStaff` / capability helpers; actions repeat the
check. Nav is capability-filtered. No Next.js middleware auth (intentional).

Staff notes stay off the customer shipment DTO. Prices and stock are
recomputed server-side (V2.3 business logic).

Gaps: public payment GET; `canWriteCustomerResource` follows
`read_any_customer` (admin/manager can PATCH another profile via API).

### File upload — V5

Staff-only, catalog role. Magic bytes, not client `Content-Type`. JPEG / PNG /
WebP, 8 MiB. Server-generated keys `yyyy/mm/<uuid>.<ext>`. Filesystem store
rejects `..` and keys outside the root. `GET /api/media/…` is public by
design and sets `nosniff`. SVG/HTML/GIF rejected.

Gaps: no documented malware scan (`v5.0.0-5.4.3` L2); no per-user quota
(L3); production still uses the filesystem `MediaStore`.

### Secrets — V11, V13

`src/lib/config.ts` validates `NODE_ENV`, `APP_URL`, `APP_LOCALE`,
`LOG_LEVEL`, `DATABASE_URL`, and `AUTH_SECRET`. Named environments and
secret ownership are in `docs/environments.md` (ADR-0043). `.env` is gitignored.
Production `next start` (not `next build`) requires `DATABASE_URL`, an
https `APP_URL`, and `AUTH_SECRET` ≥ 32 characters. `AUTH_SECRET` signs
guest-cart cookies.

Gaps: default `DATABASE_URL` embeds `bikes:bikes` in non-production; demo
passwords in source; `compose.ts` still reads `process.env` for the demo
stack (architecture boundary); no payment-provider secret in the schema
because the mock is always wired.

### Logging — V16.2–16.3

`lib/logger` emits JSON. HTTP lines carry `requestId`, method, path, status,
duration, optional `userId` — not bodies. Auth events go through
`createSecurityLog`. Audit and notification payloads strip secret-shaped
keys. Webhook route does not log `rawBody`.

Gaps: logger has no automatic redactor (`v5.0.0-16.2.5`); client may supply
`X-Request-Id`; no log inventory or retention policy (`v5.0.0-16.1.1` L2);
failed authorization is not systematically logged (`v5.0.0-16.3.2` L2).

### Error handling — V16.5

`toHttpError` maps `AppError` to a Russian `systemMessage(code)` and unknown
throws to `internal_error`. Stack, SQL, and `AppError.context` stay off the
JSON envelope. Server actions return catalogue strings.

Gaps: no `src/app/error.tsx` last-resort UI; Next.js dev overlay can show
stacks locally.

### Payment callbacks — V2.3, V4.1, V8.2

Designed correctly: `handleWebhook` verifies, then dedupes on
`(provider, providerEventId)`, then applies status. Browser return uses
`observeReturn` and ignores query-string status. Events store sanitized
fields, not raw bodies.

Runtime: mock signature `ok`, in-memory store, demo payment pre-seeded.
Idempotency and signature checks are real code paths against a toy verifier.

### Admin endpoints — V8.2, V8.4, V3.5

`/admin` is a separate shell, `noindex`, layout-gated. API admin routes use
`order_management` (and sibling policies). Mutations are Origin-checked.
Demo staff login is compiled out of production. Audit rows on customer
lookup and admin writes.

Gaps: same as session/auth — no MFA, no staff password change, static
admin-login rate key, no extra network factor for the console (L3).

---

## Checklist

Requirements are L1 unless the Level column says otherwise. “Evidence” is the
primary implementation site, not an exhaustive list.

### Injection and encoding

| ID          | Requirement (short)                        | Lvl | Status  | Evidence / gap                                                  |
| ----------- | ------------------------------------------ | --- | ------- | --------------------------------------------------------------- |
| 1.1.1       | Canonicalize input once, before validation | 2   | L2+     | Zod at the HTTP boundary; no double-decode pipeline documented. |
| 1.1.2       | Encode at the interpreter                  | 2   | L2+     | React + Prisma do this implicitly.                              |
| 1.2.1       | Context-correct HTML/HTTP encoding         | 1   | **Met** | React text nodes; no user HTML.                                 |
| 1.2.2       | URL encoding; no `javascript:`             | 1   | **Met** | App Router `href` values are app paths; media keys validated.   |
| 1.2.3       | Safe JS/JSON embedding                     | 1   | **Met** | `serializeJsonLd` escapes `<` / `>` to `\u003c` / `\u003e`.     |
| 1.2.4       | Parameterized SQL / ORM                    | 1   | **Met** | Prisma; bound `$queryRaw` for FTS and expiry.                   |
| 1.2.5       | OS command injection                       | 1   | **N/A** | No OS command API in `src/`.                                    |
| 1.2.6–1.2.8 | LDAP / XPath / LaTeX                       | 2   | **N/A** | Not used.                                                       |
| 1.3.1       | HTML sanitizer for WYSIWYG                 | 1   | **N/A** | No rich-text input.                                             |
| 1.3.2       | No `eval` / dynamic code                   | 1   | **Met** | None in application code.                                       |
| 1.5.1       | XXE-safe XML                               | 1   | **N/A** | No XML parser on untrusted input.                               |

### Validation and business logic

| ID    | Requirement (short)               | Lvl | Status      | Evidence / gap                                                         |
| ----- | --------------------------------- | --- | ----------- | ---------------------------------------------------------------------- |
| 2.1.1 | Document validation rules         | 1   | **Partial** | `docs/api.md`, checkout `validate.ts`; no single schema catalogue.     |
| 2.2.1 | Allow-list / schema validation    | 1   | **Met**     | Zod on `/api`; checkout and auth actions validate server-side.         |
| 2.2.2 | Validate at a trusted layer       | 1   | **Met**     | Prices, stock, and totals recomputed in services.                      |
| 2.3.1 | Sequential business flows         | 1   | **Partial** | Order/payment/fulfillment state machines; payment runtime is mock.     |
| 2.3.3 | Transactions succeed or roll back | 2   | L2+         | Checkout holds and inventory ledger are transactional (ADR-0014).      |
| 2.3.4 | No double-book of limited stock   | 2   | L2+         | Race-safe reservations; integration tests exist.                       |
| 2.4.1 | Anti-automation on costly routes  | 2   | **Met**     | Auth, checkout, payment start, and webhooks (ADR-0042). Search is not. |

### XSS, cookies, CSRF, headers

| ID    | Requirement (short)                 | Lvl | Status      | Evidence / gap                                                |
| ----- | ----------------------------------- | --- | ----------- | ------------------------------------------------------------- |
| 3.2.1 | Correct content context             | 1   | **Met**     | JSON-LD is escaped + nonced; media and HTML send `nosniff`.   |
| 3.2.2 | Text via safe DOM APIs              | 1   | **Met**     | React `textContent` semantics.                                |
| 3.3.1 | `Secure` + `__Secure-` / `__Host-`  | 1   | **Met**     | `__Host-bikes_session` / `__Host-bikes_guest` when https.     |
| 3.3.2 | SameSite matches purpose            | 2   | L2+         | `Lax` on the session cookie.                                  |
| 3.3.4 | HttpOnly for session tokens         | 2   | L2+         | Set; token never in JSON.                                     |
| 3.4.1 | HSTS ≥ 1 year                       | 1   | **Met**     | `max-age=31536000; includeSubDomains` when https is enforced. |
| 3.4.2 | CORS allow-list, not `*` + secrets  | 1   | **Met**     | No open CORS; API is same-origin.                             |
| 3.4.3 | CSP with `object-src` / `base-uri`  | 2   | **Met**     | Nonce CSP in `src/middleware.ts`; no third-party hosts.       |
| 3.4.4 | `X-Content-Type-Options: nosniff`   | 2   | **Met**     | Middleware + `next.config.ts` on `/:path*`; media GET also.   |
| 3.4.5 | Referrer-Policy                     | 2   | **Met**     | `strict-origin-when-cross-origin`.                            |
| 3.4.6 | `frame-ancestors`                   | 2   | **Met**     | `'none'` plus `X-Frame-Options: DENY`.                        |
| 3.5.1 | CSRF token or non-safelisted header | 1   | **Partial** | Origin check on `/api`; server actions are framework-only.    |
| 3.5.2 | CORS-preflight not the only gate    | 1   | **Met**     | Mutations are JSON/form POST with Origin check.               |
| 3.5.3 | Unsafe methods for mutations        | 1   | **Met**     | POST/PATCH/DELETE; GET payment return is read/poll.           |
| 3.7.1 | No Flash / ActiveX / applets        | 2   | L2+         | React 19 only.                                                |
| 3.7.2 | External redirect allow-list        | 2   | L2+         | Staff-entered tracking URLs can be any https URL.             |

### API and webhooks

| ID     | Requirement (short)         | Lvl | Status      | Evidence / gap                                        |
| ------ | --------------------------- | --- | ----------- | ----------------------------------------------------- |
| 4.1.1  | Content-Type matches body   | 1   | **Partial** | JSON envelope on `/api`; charset not always explicit. |
| 4.3.\* | GraphQL DoS / introspection | 2   | **N/A**     | No GraphQL.                                           |
| 4.4.\* | WebSockets                  | 1–2 | **N/A**     | No WebSockets.                                        |

### File upload

| ID    | Requirement (short)              | Lvl | Status  | Evidence / gap                                          |
| ----- | -------------------------------- | --- | ------- | ------------------------------------------------------- |
| 5.1.1 | Document types, extensions, size | 2   | L2+     | `docs/media.md` covers JPEG/PNG/WebP and 8 MiB.         |
| 5.2.1 | Reject oversized uploads         | 1   | **Met** | `MAX_UPLOAD_BYTES`.                                     |
| 5.2.2 | Extension matches magic bytes    | 1   | **Met** | `detectImageType`; claimed type ignored.                |
| 5.3.1 | Uploads not executed as code     | 1   | **Met** | Served as sniffed image types; no public script upload. |
| 5.3.2 | No path traversal in file ops    | 1   | **Met** | `isMediaKey` + `path.relative` jail.                    |
| 5.4.3 | Antivirus on untrusted files     | 2   | L2+     | Not implemented.                                        |

### Authentication

| ID     | Requirement (short)             | Lvl | Status      | Evidence / gap                                                          |
| ------ | ------------------------------- | --- | ----------- | ----------------------------------------------------------------------- |
| 6.1.1  | Document brute-force controls   | 1   | **Partial** | ADR-0016 describes the port; server-action keys are undocumented.       |
| 6.2.1  | Password ≥ 8 (15 recommended)   | 1   | **Met**     | Minimum 10.                                                             |
| 6.2.2  | Users can change password       | 1   | **Partial** | Customers yes; staff no.                                                |
| 6.2.3  | Change requires current + new   | 1   | **Met**     | Customer change-password.                                               |
| 6.2.4  | Block top-3000 passwords        | 1   | **Gap**     | Length only.                                                            |
| 6.2.5  | No composition rules            | 1   | **Met**     | Length 10–128 only.                                                     |
| 6.2.6  | `type=password`                 | 1   | **Met**     | Login, register, security forms.                                        |
| 6.2.8  | Verify password unmodified      | 1   | **Met**     | Passed through to Argon2.                                               |
| 6.2.9  | Allow ≥ 64 characters           | 2   | L2+         | Max 128.                                                                |
| 6.2.10 | No periodic rotation            | 2   | L2+         | No expiry.                                                              |
| 6.3.1  | Brute-force / stuffing controls | 1   | **Met**     | IP + hashed-email keys; HTML actions use `x-forwarded-for`. In-process. |
| 6.3.2  | No default admin accounts       | 1   | **Partial** | No production seed; demo `staff@bikes.local` in non-prod source.        |
| 6.3.3  | MFA                             | 2   | L2+         | Not implemented. ADR-0016 “when to revisit”.                            |
| 6.4.2  | No secret questions             | 1   | **Met**     | Absent.                                                                 |
| 6.4.3  | Reset does not bypass MFA       | 2   | L2+         | Reset exists; no MFA to bypass.                                         |

### Session management

| ID    | Requirement (short)                 | Lvl | Status      | Evidence / gap                                                              |
| ----- | ----------------------------------- | --- | ----------- | --------------------------------------------------------------------------- |
| 7.1.1 | Document idle + absolute TTL        | 2   | L2+         | `docs/auth.md`, ADR-0029.                                                   |
| 7.2.1 | Verify tokens server-side           | 1   | **Met**     | `auth.resolve` hashes and looks up.                                         |
| 7.2.2 | Dynamic session tokens              | 1   | **Met**     | Per-login CSPRNG token.                                                     |
| 7.2.3 | ≥ 128 bits entropy                  | 1   | **Met**     | 32 bytes.                                                                   |
| 7.2.4 | New token on authentication         | 1   | **Met**     | `issueSession` on login.                                                    |
| 7.3.1 | Inactivity timeout                  | 2   | L2+         | Staff 30 min; customers none (documented).                                  |
| 7.3.2 | Absolute lifetime                   | 2   | L2+         | 14 days / 12 hours.                                                         |
| 7.4.1 | Logout invalidates backend          | 1   | **Met**     | `revoke` + clear cookie.                                                    |
| 7.4.2 | Disable/delete ends sessions        | 1   | **Partial** | `disabledAt` blocks `canAuthenticate`; bulk revoke on disable not explicit. |
| 7.4.3 | Password change ends other sessions | 2   | L2+         | Customer change and reset do.                                               |
| 7.4.4 | Visible logout when authenticated   | 2   | L2+         | Account and admin shells.                                                   |
| 7.4.5 | Admin can terminate sessions        | 2   | L2+         | No staff session-admin UI.                                                  |
| 7.5.1 | Re-auth before changing email       | 2   | L2+         | Email is immutable (`emailReadonly`).                                       |

### Authorization and access control

| ID    | Requirement (short)                     | Lvl | Status      | Evidence / gap                                                    |
| ----- | --------------------------------------- | --- | ----------- | ----------------------------------------------------------------- |
| 8.1.1 | Document function- and data-level rules | 1   | **Met**     | `docs/auth.md`, `docs/api.md`, ADR-0017.                          |
| 8.2.1 | Function-level permissions              | 1   | **Met**     | `withRoute` + `hasCapability`.                                    |
| 8.2.2 | Object-level (IDOR / BOLA)              | 1   | **Partial** | Orders/profile/wishlist/addresses checked; payment GET is public. |
| 8.3.1 | Enforce in a trusted layer              | 1   | **Met**     | Services, not the browser.                                        |
| 8.4.1 | Cross-tenant isolation                  | 2   | **N/A**     | Single shop, not multi-tenant.                                    |
| 8.4.2 | Extra factors on admin                  | 3   | L2+         | Separate shell only.                                              |

### Cryptography

| ID     | Requirement (short)              | Lvl | Status  | Evidence / gap                              |
| ------ | -------------------------------- | --- | ------- | ------------------------------------------- |
| 11.2.1 | Industry libraries               | 2   | L2+     | `@node-rs/argon2`, Node `crypto`.           |
| 11.4.1 | No MD5 for crypto                | 1   | **Met** | SHA-256 for tokens; Argon2id for passwords. |
| 11.4.2 | Password KDF with current params | 2   | L2+     | Argon2id OWASP profile.                     |
| 11.5.1 | CSPRNG ≥ 128 bits                | 2   | L2+     | `randomBytes(32)` for sessions and tokens.  |

### Secrets and configuration

| Topic                           | ASVS                  | Status      | Evidence / gap                                                                    |
| ------------------------------- | --------------------- | ----------- | --------------------------------------------------------------------------------- |
| Secrets only from validated env | Architecture §14, V13 | **Partial** | `config.ts` validates production secrets; `compose.ts` still reads `process.env`. |
| No secrets in git               | Architecture §14      | **Partial** | `.env` ignored; demo passwords and default DB URL are committed.                  |
| Payment provider secret         | V13 / V11.1           | **Gap**     | No env hook; mock always selected.                                                |
| `AUTH_SECRET`                   | V13                   | **Met**     | Required ≥32 chars on `next start`; signs guest-cart cookies.                     |
| Secret ownership                | Architecture §15      | **Met**     | `docs/environments.md`: platform owns prod/staging secrets.                       |

### Logging and errors

| ID     | Requirement (short)            | Lvl | Status | Evidence / gap                                                         |
| ------ | ------------------------------ | --- | ------ | ---------------------------------------------------------------------- |
| 16.1.1 | Log inventory and retention    | 2   | L2+    | Not written.                                                           |
| 16.2.1 | When / where / who / what      | 2   | L2+    | HTTP + security-log fields.                                            |
| 16.2.4 | Machine-readable format        | 2   | L2+    | JSON lines.                                                            |
| 16.2.5 | No credentials / cards in logs | 2   | L2+    | Policy + audit/notification sanitizers; logger itself does not redact. |
| 16.3.1 | Log auth success and failure   | 2   | L2+    | `auth.login.failure` / security log.                                   |
| 16.3.2 | Log failed authorization       | 2   | L2+    | Not systematic.                                                        |
| 16.5.1 | Generic client errors          | 2   | L2+    | `toHttpError`; API Met in practice.                                    |
| 16.5.3 | Fail closed                    | 2   | L2+    | Validation failure aborts checkout; webhook rejects bad signatures.    |

### Payment callbacks (mapped)

| Topic                         | ASVS         | Status      | Evidence / gap                                                   |
| ----------------------------- | ------------ | ----------- | ---------------------------------------------------------------- |
| Verify before process         | 2.3.1, 8.2.1 | **Partial** | `verifyWebhook` then apply; verifier is mock.                    |
| Idempotent events             | 2.3.3        | **Partial** | Unique `(provider, provider_event_id)`; memory store in compose. |
| No CSRF on provider POST      | 3.5.1        | **Met**     | `{ csrf: false }` + signature.                                   |
| Ignore client-supplied status | 2.2.2        | **Met**     | `observeReturn` polls the provider.                              |
| Do not store raw bodies       | 16.2.5       | **Met**     | Event row is sanitized fields.                                   |
| Authenticated payment read    | 8.2.2        | **Gap**     | Public GET by id.                                                |

### Admin endpoints (mapped)

| Topic                          | ASVS         | Status          | Evidence / gap                               |
| ------------------------------ | ------------ | --------------- | -------------------------------------------- |
| Separate admin surface         | 8.1.1, 8.2.1 | **Met**         | `/admin`, capability nav, `noindex`.         |
| Page + action + service checks | 8.3.1        | **Met**         | Layout, `requireAdmin*`, domain helpers.     |
| CSRF on admin API              | 3.5.1        | **Met**         | Origin check.                                |
| Staff session timeout          | 7.3.1        | **Met** (staff) | 30 min idle / 12 h absolute.                 |
| Audit without secrets          | 16.2.5       | **Met**         | `prepareAuditRecord` / `sanitizeAuditValue`. |
| MFA / step-up for admin        | 6.3.3, 8.4.2 | L2+             | Password only.                               |

---

## Architecture claims that this review contradicts

Keep these visible so §14 is not treated as implemented fact.

| Claim in `docs/architecture.md` §14 | Finding                                                 |
| ----------------------------------- | ------------------------------------------------------- |
| Secrets only via `lib/config.ts`    | `compose.ts` still reads `process.env` for demo wiring. |
| Webhooks verify provider signatures | Code path yes; production compose still uses the mock.  |

## When this document is wrong

Re-run the review when any of these land: a real `PaymentProvider`, HSTS
preload, MFA, a seed pipeline that removes demo passwords from production
builds, or a distributed rate-limit adapter. Update the checklist rows; do
not silently edit an Accepted ADR. Headers and secrets closed in ADR-0041.
Abuse controls closed in ADR-0042.
