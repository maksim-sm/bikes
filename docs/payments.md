# Payments

Status: authoritative for the provider-neutral payment port. Companion:
ADR-0005, ADR-0022, `docs/architecture.md` §8, `docs/checkout.md`.

`payments` owns attempts, the provider event log, and refunds. It does not
write order rows. `orders` decides what a normalized event means for order
payment status.

No provider has been chosen. bePaid, WebPay, and ERIP stay unnamed outside
this module. Compose wires `MockPaymentProvider` until a real adapter exists.

## Provider interface

Every adapter implements the same six methods:

| Method              | Role                                                                 |
| ------------------- | -------------------------------------------------------------------- |
| `createPayment`     | Start a charge. Retries pass the same idempotency key.               |
| `getPaymentStatus`  | Read the provider's current normalized status.                       |
| `cancelPayment`     | Void a pending attempt.                                              |
| `refundPayment`     | Return money; retries pass a refund idempotency key.                 |
| `verifyWebhook`     | Check the signature, then return a provider event.                   |
| `normalizeStatus`   | Map a provider-specific string onto `NormalizedPaymentStatus`.       |

`verifyWebhook` must include `providerPaymentId`. Services must not parse
provider JSON to find the attempt.

## Defined types

| Concept              | Meaning                                                                 |
| -------------------- | ----------------------------------------------------------------------- |
| Provider reference   | `{ name }` stored on the attempt (`"mock"` today).                      |
| Payment attempt      | One try to collect an order's amount (`Payment` in Prisma).             |
| Provider event       | A verified notification, unique on `(provider, providerEventId)`.       |
| Idempotency key      | `pay:<orderId>:<attempt>` or `refund:<paymentId>:<amountMinor>`.        |
| Normalized status    | `PENDING`, `SUCCEEDED`, `FAILED`, `CANCELLED`, `REFUNDED`, `PARTIALLY_REFUNDED`. |

Money is integer kopeks. A browser return URL is a hint, never confirmation.
Webhook handlers stay public and authenticate the provider signature.

## Replacing the provider

1. Implement `PaymentProvider` under `src/modules/payments/infrastructure/`.
2. Keep SDKs, credentials, and field names inside that file.
3. Swap the instance in `getPaymentServices()`.
4. Reuse the same `PaymentServices` and webhook route.

A second in-test adapter (`RecordingPaymentProvider`) proves the services do
not depend on `MockPaymentProvider`.
