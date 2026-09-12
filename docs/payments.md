# Payments

Status: authoritative for the provider-neutral payment port. Companion:
ADR-0005, ADR-0022, ADR-0023, ADR-0024, `docs/architecture.md` §8,
`docs/checkout.md`.

`payments` owns attempts, the provider event log, and refunds. It does not
write order rows. `orders` decides what a normalized event means for order
payment status.

No provider has been chosen. bePaid, WebPay, and ERIP stay unnamed outside
this module. Compose wires `MockPaymentProvider` until a real adapter exists.

## Provider interface

Every adapter implements the same six methods:

| Method             | Role                                                           |
| ------------------ | -------------------------------------------------------------- |
| `createPayment`    | Start a charge. Retries pass the same idempotency key.         |
| `getPaymentStatus` | Read the provider's current normalized status.                 |
| `cancelPayment`    | Void a pending attempt.                                        |
| `refundPayment`    | Return money; retries pass a refund idempotency key.           |
| `verifyWebhook`    | Check the signature, then return a provider event.             |
| `normalizeStatus`  | Map a provider-specific string onto `NormalizedPaymentStatus`. |

`verifyWebhook` must include `providerPaymentId`. Services must not parse
provider JSON to find the attempt.

## Defined types

| Concept            | Meaning                                                                          |
| ------------------ | -------------------------------------------------------------------------------- |
| Provider reference | `{ name }` stored on the attempt (`"mock"` today).                               |
| Payment attempt    | One try to collect an order's amount (`Payment` in Prisma).                      |
| Provider event     | A verified notification, unique on `(provider, providerEventId)`.                |
| Idempotency key    | `pay:<orderId>:<attempt>` or `refund:<paymentId>:<amountMinor>`.                 |
| Normalized status  | `PENDING`, `SUCCEEDED`, `FAILED`, `CANCELLED`, `REFUNDED`, `PARTIALLY_REFUNDED`. |

Money is integer kopeks. A browser return URL is a hint, never confirmation.
`GET /api/v1/payments/:id` calls `observeReturn`, which polls the provider
and ignores query claims such as `?status=succeeded`. Webhook handlers stay
public and authenticate the provider signature.

## Lifecycle

`payments.status` is the source of truth. Transitions are explicit; illegal
moves throw `illegal_payment_transition` and are ignored on webhooks and
return polls.

| From                                            | To                                                                            |
| ----------------------------------------------- | ----------------------------------------------------------------------------- |
| `CREATED`                                       | `PENDING`, `AUTHORIZED`, `SUCCEEDED` (paid), `FAILED`, `EXPIRED`, `CANCELLED` |
| `PENDING`                                       | `AUTHORIZED`, `SUCCEEDED`, `FAILED`, `EXPIRED`, `CANCELLED`                   |
| `AUTHORIZED`                                    | `SUCCEEDED` (capture), `FAILED`, `EXPIRED`, `CANCELLED` (void)                |
| `SUCCEEDED`                                     | `REFUND_PENDING`, `REFUNDED`, `PARTIALLY_REFUNDED`                            |
| `REFUND_PENDING`                                | `REFUNDED`, `PARTIALLY_REFUNDED`, `SUCCEEDED` (refund failed)                 |
| `PARTIALLY_REFUNDED`                            | `REFUND_PENDING`, `REFUNDED`                                                  |
| `FAILED` / `EXPIRED` / `CANCELLED` / `REFUNDED` | terminal                                                                      |

`AUTHORIZED` is a hold. `SUCCEEDED` is paid (captured). Partial refunds exist
only when the provider reports them. A new attempt is allowed after
`FAILED`, `EXPIRED`, `CANCELLED`, or `REFUNDED`.

A `CREATED` / `PENDING` attempt times out after 15 minutes (`expiresAt`).
`expireDue` and `observeReturn` apply `EXPIRED`. Abandoned checkouts (the
inventory hold expired first) are closed by `expireOpenForOrders`.

`FAILED`, `EXPIRED`, and `CANCELLED` tell `orders` to release ACTIVE
reservations. `cancelForOrder` skips holds that are already released or
expired, so a webhook replay plus a timeout plus `expireDue` still decrement
`reserved` **once**. A later `startPayment` is a retry: `created` re-reserves
if the order is still `PLACED` and has no ACTIVE hold.

## Replacing the provider

1. Implement `PaymentProvider` under `src/modules/payments/infrastructure/`.
2. Keep SDKs, credentials, and field names inside that file.
3. Swap the instance in `getPaymentServices()`.
4. Reuse the same `PaymentServices` and webhook route.

A second in-test adapter (`RecordingPaymentProvider`) proves the services do
not depend on `MockPaymentProvider`.
