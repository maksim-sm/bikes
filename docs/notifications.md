# Transactional notifications

Status: authoritative companion to ADR-0034.

Customer messages are an **outbox**, not a side effect inside an order
transaction. Commerce modules persist first, then call `notifications.dispatch`.
A channel failure is stored as `FAILED` and never thrown to the caller, so a
down mail host cannot roll back a placed order or a captured payment.

## Ownership

`notifications` owns `notifications` and `notification_attempts`. There is no
foreign key to orders, payments, or users: the outbox records an event name,
entity type, entity id, and recipient email.

Other modules may import `@/modules/notifications`. This module must not import
`orders`, `payments`, `delivery`, or `identity`. Recipient lookup for payment
and shipment events happens at compose time via `getPlacedOrder`.

## Events

| Event                | When                                              | Entity  |
| -------------------- | ------------------------------------------------- | ------- |
| `order.created`      | Checkout succeeds (after the cart is cleared)     | order   |
| `payment.pending`    | Attempt is `CREATED` / `PENDING` / `AUTHORIZED`   | payment |
| `payment.successful` | Attempt is `SUCCEEDED`                            | payment |
| `payment.failed`     | Attempt is `FAILED` / `EXPIRED` / `CANCELLED`     | payment |
| `order.processing`   | Staff assign a shipment                           | order   |
| `order.shipped`      | Staff mark the shipment shipped                   | order   |
| `order.delivered`    | Staff mark the shipment delivered                 | order   |
| `order.cancelled`    | Explicit `cancelOrder`                            | order   |
| `refund.initiated`   | Attempt is `REFUND_PENDING`, or jumps to refunded | payment |
| `refund.completed`   | Attempt is `REFUNDED` / `PARTIALLY_REFUNDED`      | payment |
| `password.reset`     | Customer requested a reset                        | user    |

Checkout that auto-cancels because a later reserve failed does **not** emit
`order.created` or `order.cancelled`. The customer never had a completed
checkout.

`password.reset` is the only repeatable event. Its idempotency key includes a
fresh suffix so a second request stores a second row. Every other event uses
`${event}:${entityType}:${entityId}`: a `SENT` row is returned as-is; a
`FAILED` row is retried.

## Secrets

Reset tokens travel in `secret.urlToken` for the channel only. Payload JSON is
sanitized: keys that look like `password`, `secret`, `token`, `cookie`,
`authorization`, or `session` are dropped. Last-error text is clipped to 240
characters and `token=` query values are redacted.

The development email channel logs `event`, recipient, and subject. It never
logs the action URL.

## Statuses

Each notification is `PENDING` while the channel runs, then `SENT` or
`FAILED`. Every send writes a `notification_attempts` row. `listByEntity` is
the read path for tests and a later admin view — this prompt does not add UI.
