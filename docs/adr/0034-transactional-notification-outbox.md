# ADR-0034: Transactional notification outbox

- Status: Accepted
- Date: 2026-09-13
- Amends: [ADR-0013](0013-independent-commerce-statuses.md), [ADR-0033](0033-russian-first-i18n-surfaces.md)

## Context

Order, payment, fulfillment, and password-reset events need customer email.
Putting `sendMail` inside the same database transaction as `orders.save`
couples commerce state to SMTP. A timeout would roll back a placed order.
There was also no record of whether a message left the process.

## Decision

1. **`notifications` is its own module.** It owns `notifications` and
   `notification_attempts`. Commerce modules persist, then `dispatch`.
   `dispatch` never throws: channel failure becomes a `FAILED` row.
2. **Idempotency is per event and entity**, except `password.reset`, which
   appends a unique suffix so repeats are stored.
3. **Tokens never persist.** The channel receives `secret.urlToken`. Payload
   keys that look like secrets are stripped; error text is clipped and
   redacted.
4. **Copy stays in `email.*` / `notifications.*`.** Domain events are stable
   English identifiers (`order.created`). The channel maps them onto catalogue
   kinds and formats kopeks with `formatPrice`.
5. **No admin console in this change.** `listByEntity` is enough to inspect
   attempts.

## Alternatives considered

**Send inside the order transaction.** Rejected: SMTP latency and failure
must not corrupt `PLACED` / `SUCCEEDED`.

**Let `orders` own the outbox.** Rejected: payment, delivery, and identity
also emit, and notifications must not SQL-join those tables.

**Queue-only, no local rows.** Rejected: we need attempt history without a
broker.

## Consequences

- Compose looks up the order contact for payment and shipment emails.
- Password reset in production/demo goes through the outbox; identity unit
  tests still use `createCapturingMailer` directly.
- A later worker can scan `FAILED` rows and call `dispatch` again.

## When to revisit

A real provider adapter (SMTP/API) or a requirement to show staff the outbox
in `/admin`.
