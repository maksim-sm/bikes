# HTTP API conventions

Status: authoritative for Route Handlers under `/api`. Decision: ADR-0015.
The HTML storefront still renders through server components. This document is
the contract for **external HTTP** — webhooks, health, and clients that are
not our React tree.

Handlers live in `src/app/api/**/route.ts`. They call module services and
return **DTOs**. They never return a service instance, a repository, or a
domain object by spreading it.

## Response conventions

Every JSON response is an envelope.

Success:

```json
{
  "ok": true,
  "requestId": "2c1e…",
  "data": {},
  "meta": { "page": 1, "pageSize": 20, "total": 42 }
}
```

`meta` is present only on paginated lists.

Error:

```json
{
  "ok": false,
  "requestId": "2c1e…",
  "error": { "code": "not_found", "message": "product not found" }
}
```

Rules:

- HTTP status matches `error.code` (see error mapping).
- `data` is a DTO built field-by-field. No `status` leakage from catalogue
  write-models, no Prisma rows, no class instances.
- Stack traces, `AppError.context`, SQL, and provider payloads never appear.
- `Cache-Control: no-store` on authenticated and commerce routes. Health may
  be polled; it still uses the envelope.

## Validation conventions

Zod runs at the Route Handler boundary (`parseWithSchema`, `parsePageQuery`,
`parseFilters`, `parseSortQuery`). Services receive already-valid values.

- Bodies are parsed as JSON and checked with a schema named at the handler.
- Query strings are allow-listed. Unknown filter keys are `validation_failed`.
- Path segments that must be ids or slugs are validated before a service call.

## Error mapping

| `AppError.code`     | Status                 |
| ------------------- | ---------------------- |
| `validation_failed` | 400                    |
| `unauthenticated`   | 401                    |
| `forbidden`         | 403                    |
| `not_found`         | 404                    |
| `conflict`          | 409                    |
| `rate_limited`      | 429                    |
| anything else       | 500 (`internal_error`) |

Unexpected throws become `internal_error` with the message `"internal error"`.

## Authentication checks

Identity owns credentials. The handler resolves a `Principal` from the
`bikes_session` **httpOnly** cookie and passes it inward. The raw session
token is never included in JSON.

Missing or unknown cookies are `anonymous`. `withRoute(policy, handler)`
applies the check before the handler runs:

| Policy     | Who may proceed                 |
| ---------- | ------------------------------- |
| `public`   | Anyone, including anonymous     |
| `customer` | Authenticated customer or staff |
| `staff`    | Staff only                      |

Payment webhooks are `public` and authenticate the **provider** (signature),
not a customer session.

## Authorization checks

Coarse policy is the route (`staff` vs `customer`). Ownership is still
enforced in the service (an order id in the URL is not a permission). Staff
may read across customers; customers may not.

## Pagination

Query: `page` (default 1), `pageSize` (default 20, max 100).

`meta.total` is the filtered count before the slice. Clients must not send
`offset`.

## Filtering

Each list declares the filter keys it accepts (`category`, `q` on products).
Any other key except `page`, `pageSize`, `sort`, and `order` is rejected.

## Sorting

`sort=<allowedField>&order=asc|desc`. Unknown fields are `validation_failed`.
Each list names its default (products: `publishedAt desc`).

## Request IDs

Clients may send `X-Request-Id`. If absent, the server generates a UUID. The
same value is returned in the `X-Request-Id` header and in `requestId` on the
body, and is attached to every log line for that request.

## Logging

One `http.request` line on the way in, one `http.response` on the way out,
plus `http.error` when the envelope is `ok: false`. Lines go through
`lib/logger` (JSON). They carry `requestId`, method, path, status, duration,
and `userId` when known.

Never log passwords, session tokens, card data, provider secrets, or raw
webhook bodies.

## Resources (v1)

| Method | Path                           | Policy   | Purpose                           |
| ------ | ------------------------------ | -------- | --------------------------------- |
| GET    | `/api/health`                  | public   | Process liveness                  |
| GET    | `/api/v1/session`              | public   | Resolved principal                |
| POST   | `/api/v1/auth/register`        | public   | Register (always same shape)      |
| POST   | `/api/v1/auth/login`           | public   | Login; sets httpOnly cookie       |
| POST   | `/api/v1/auth/logout`          | public   | Revoke session; clear cookie      |
| POST   | `/api/v1/auth/email/verify`    | public   | Confirm email with mailed token   |
| POST   | `/api/v1/auth/email/resend`    | public   | Resend verification (opaque)      |
| POST   | `/api/v1/auth/password/forgot` | public   | Request reset (opaque)            |
| POST   | `/api/v1/auth/password/reset`  | public   | Set new password; revoke sessions |
| GET    | `/api/v1/products`             | public   | Published catalogue, paginated    |
| GET    | `/api/v1/products/:slug`       | public   | Published product detail          |
| GET    | `/api/v1/orders/:id`           | customer | Order DTO (ownership in service)  |
| POST   | `/api/v1/payments/webhooks`    | public   | Provider webhook (signature)      |

New external endpoints are Route Handlers that reuse `withRoute` and a DTO.
They are not added “because REST”.
