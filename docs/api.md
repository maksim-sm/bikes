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
  "error": { "code": "not_found", "message": "Ничего не найдено" }
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

Unexpected throws become `internal_error`. `error.message` is the Russian
catalogue line for that code (`docs/i18n.md`); `code` stays a stable English
identifier. Domain English text never appears in the envelope.

## Authentication checks

Identity owns credentials. The handler resolves a `Principal` from the
`bikes_session` **httpOnly** cookie and passes it inward. The raw session
token is never included in JSON.

Missing or unknown cookies are `anonymous`. `withRoute(policy, handler)`
applies the check before the handler runs:

| Policy             | Who may proceed                                  |
| ------------------ | ------------------------------------------------ |
| `public`           | Anyone, including anonymous                      |
| `anonymous`        | Only an anonymous caller                         |
| `customer`         | Authenticated customer or staff                  |
| `customer_only`    | Customer accounts only                           |
| `staff`            | Any staff principal                              |
| `admin`            | Admin title                                      |
| `manager`          | Manager title (admin implies)                    |
| `inventory`        | Inventory title (admin and manager imply)        |
| `order_management` | Order-management title (admin and manager imply) |

Payment webhooks are `public` and authenticate the **provider** (signature),
not a customer session.

## Authorization checks

Coarse policy is the route. Ownership is still enforced in the service (an
id in the URL is not a permission). A customer cannot read another
customer's order, address, wishlist, or profile. Order-management staff may
read any order. Only admin and manager may read another customer's profile,
addresses, or wishlist. See ADR-0017.

## Pagination

Query: `page` (default 1), `pageSize` (default 20, max 100).

`meta.total` is the filtered count before the slice. Clients must not send
`offset`.

## Filtering

Each list declares the filter keys it accepts. Products accept `category`,
`brand`, `bicycleType`, `frameSize`, `wheelSize`, `minPrice`, `maxPrice`,
`available`, `q`, `frameMaterial`, `groupset`, and `brakeType`. Filtering
runs in PostgreSQL (`docs/catalog.md`). Any other key except `page`,
`pageSize`, `sort`, and `order` is rejected.

## Sorting

`sort=<allowedField>&order=asc|desc`. Unknown fields are `validation_failed`.
Each list names its default (products: `publishedAt desc`; also `name`,
`price`, `relevance` — default when `q` is set).

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

| Method | Path                                          | Policy           | Purpose                                  |
| ------ | --------------------------------------------- | ---------------- | ---------------------------------------- |
| GET    | `/api/health`                                 | public           | Process liveness (200 while draining)    |
| GET    | `/api/ready`                                  | public           | Readiness (Postgres; 503 if not ready)   |
| GET    | `/api/v1/session`                             | public           | Resolved principal                       |
| POST   | `/api/v1/auth/register`                       | public           | Register (always same shape)             |
| POST   | `/api/v1/auth/login`                          | public           | Login; merge guest cart; set cookie      |
| POST   | `/api/v1/auth/logout`                         | public           | Revoke session; clear cookie             |
| POST   | `/api/v1/auth/email/verify`                   | public           | Confirm email with mailed token          |
| POST   | `/api/v1/auth/email/resend`                   | public           | Resend verification (opaque)             |
| POST   | `/api/v1/auth/password/forgot`                | public           | Request reset (opaque)                   |
| POST   | `/api/v1/auth/password/reset`                 | public           | Set new password; revoke sessions        |
| POST   | `/api/v1/auth/password/change`                | customer_only    | Change password; revoke other sessions   |
| POST   | `/api/v1/auth/logout-all`                     | customer_only    | Revoke every session; clear cookie       |
| GET    | `/api/v1/products`                            | public           | Published catalogue, DB-filtered         |
| GET    | `/api/v1/products/:slug`                      | public           | Published product detail                 |
| GET    | `/api/v1/categories`                          | public           | Category tree for discovery              |
| GET    | `/api/v1/brands`                              | public           | Brands for discovery                     |
| GET    | `/api/v1/cart`                                | public           | Cart view; server-side totals            |
| POST   | `/api/v1/cart/items`                          | public           | Add a line; may set guest cookie         |
| PATCH  | `/api/v1/cart/items`                          | public           | Quantity or sibling variant              |
| DELETE | `/api/v1/cart/items`                          | public           | Remove a line                            |
| GET    | `/api/v1/delivery/quotes`                     | public           | Delivery quotes for a destination        |
| GET    | `/api/v1/admin/delivery/methods`              | order_management | Configured delivery methods              |
| GET    | `/api/v1/admin/deliveries`                    | order_management | Shipment for `?orderId=`                 |
| POST   | `/api/v1/admin/deliveries`                    | order_management | Assign a shipment                        |
| PATCH  | `/api/v1/admin/deliveries`                    | order_management | Update staff-entered tracking            |
| POST   | `/api/v1/admin/deliveries/ship`               | order_management | Record tracking; mark shipped            |
| POST   | `/api/v1/checkout`                            | public           | Place order; server totals only          |
| GET    | `/api/v1/orders`                              | customer_only    | Orders for the signed-in customer        |
| GET    | `/api/v1/orders/:id`                          | customer         | Order DTO (ownership in service)         |
| GET    | `/api/v1/orders/:id/shipment`                 | customer         | Tracking facts (no staff notes)          |
| GET    | `/api/v1/customers/:userId/profile`           | customer         | Profile DTO (self or manager/admin)      |
| PATCH  | `/api/v1/customers/:userId/profile`           | customer_only    | Update own profile                       |
| GET    | `/api/v1/customers/:userId/addresses`         | customer         | Address DTOs (self or manager/admin)     |
| POST   | `/api/v1/customers/:userId/addresses`         | customer_only    | Add an address                           |
| POST   | `/api/v1/customers/:userId/addresses/default` | customer_only    | Set the default address                  |
| GET    | `/api/v1/customers/:userId/wishlist`          | customer         | Wishlist view (self or manager/admin)    |
| POST   | `/api/v1/customers/:userId/wishlist`          | customer_only    | Add a product; 409 on duplicate          |
| DELETE | `/api/v1/customers/:userId/wishlist`          | customer_only    | Remove a product                         |
| POST   | `/api/v1/payments`                            | public           | Start a provider payment; IP-limited     |
| GET    | `/api/v1/payments/:id`                        | public           | Return landing; ignores `?status=`       |
| POST   | `/api/v1/payments/webhooks`                   | public           | Provider webhook (signature + IP limit)  |
| GET    | `/api/v1/admin/ops`                           | admin            | Failed outbox, inventory/order anomalies |

New external endpoints are Route Handlers that reuse `withRoute` and a DTO.
They are not added “because REST”.
