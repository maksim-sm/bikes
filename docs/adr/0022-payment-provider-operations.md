# ADR-0022: Payment provider operations

- Status: Accepted
- Date: 2026-09-12
- Amends: [ADR-0005](0005-provider-neutral-payments.md)

## Context

ADR-0005 put a provider-neutral port in front of checkout so Belarusian
providers (bePaid, WebPay, ERIP) could be chosen later. The first port only
had `createPayment` and `verifyWebhook`. That was enough to start a redirect
and mark an order from a signed callback.

Checkout is now live with a mock adapter. Staff still need to cancel a pending
attempt, refund, and poll status without `orders` learning a provider's API.
ADR-0005 already said refunds would extend the interface.

## Decision

`PaymentProvider` is the replaceable adapter. Every implementation exposes:

- `createPayment` — start a charge; callers pass an idempotency key
- `getPaymentStatus` — read the provider's current state
- `cancelPayment` — void a pending attempt
- `refundPayment` — return money; callers pass an idempotency key
- `verifyWebhook` — verify the signature and return a provider event
- `normalizeStatus` — map a provider string onto `NormalizedPaymentStatus`

The module also names the records around that port:

- **Provider reference** — `{ name }` stored on the attempt
- **Payment attempt** — one try to collect an order (`Payment` in Prisma)
- **Provider event** — verified notification, unique on
  `(provider, providerEventId)`
- **Idempotency key** — stable per attempt or refund so retries do not double
  charge
- **Normalized status** — `PENDING` / `SUCCEEDED` / `FAILED` / `CANCELLED` /
  `REFUNDED` / `PARTIALLY_REFUNDED`

`verifyWebhook` includes `providerPaymentId` and a normalized status. The
application service must not parse provider JSON to find the attempt.

`MockPaymentProvider` remains the compose default. A second adapter can be
swapped at compose time; services stay the same. Nothing outside `payments`
names a concrete provider.

The three rules from ADR-0005 still hold: webhooks are authoritative, signed,
and idempotent; return URLs are hints; `payments` does not write order rows.

## Alternatives considered

**Keep the two-method port and add refunds only when a provider is chosen.**
Rejected: cancel and refund are already implied by the commerce statuses and
the `Refund` table. Waiting would grow provider-shaped logic in `orders`.

**Let `handleWebhook` parse the raw body for a payment id.** Rejected: that
is mock-specific and makes the second adapter lie or share a JSON shape.

**One idempotency key per order forever.** Rejected: a failed attempt must be
retryable. The key is `pay:<orderId>:<attempt>` so a later try is a new charge
and a network retry of the same try is not.

## Reasons

- The operations staff need after checkout are the same for every plausible
  Belarusian provider; only the HTTP details differ.
- Normalized status keeps `orders.projectPaymentStatus` provider-agnostic.
- Idempotency keys belong on the port, not in each adapter's private notes.

## Consequences

- Adding a real provider is an infrastructure class plus compose wiring.
- Partial capture and settlement reports still have no method. Add them here
  when a chosen provider requires them, not in `orders`.
- A mock that succeeds too easily can still hide provider quirks. The first
  live adapter is the point to correct the mock.

## When to revisit

- A provider is chosen and a method cannot express its flow — amend this
  port, not the replaceability rule.
- Two providers must run at once. The port allows that; routing between
  names is a separate decision.
