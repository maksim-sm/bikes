# ADR-0005: Provider-neutral payment abstraction

- Status: Accepted (amended by [ADR-0022](0022-payment-provider-operations.md))
- Date: 2026-09-11

## Context

The Belarusian payment landscape offers several plausible options — bePaid,
WebPay, and ERIP among them — with materially different redirect flows, callback
formats, and settlement models. The choice is a business decision requiring a
merchant account, and it has not been made. No provider credentials exist in the
environment.

Checkout, however, is on the critical path and cannot wait for that decision.

## Decision

`orders` defines the payment interface it needs; the `payments` module
implements it. No module outside `payments` may name or import a provider.

```ts
export interface PaymentProvider {
  createPayment(input: {
    orderId: string;
    amountMinor: number;
    currency: "BYN";
    returnUrl: string;
  }): Promise<{ paymentId: string; redirectUrl: string }>;

  verifyWebhook(rawBody: string, headers: Headers): Promise<PaymentEvent>;
}
```

Provider implementations live in `modules/payments/providers/<name>.ts`. A
`MockPaymentProvider` is built in the first scaffold and is the development and
test default, so the entire checkout flow can be completed, demonstrated, and
tested before any provider is selected.

Three rules are part of this decision, not implementation detail:

1. **Payment state is authoritative only after a verified webhook.** A user
   arriving at the return URL is a hint. An order is never marked paid from a
   browser redirect.
2. **Webhook handlers verify the provider signature before doing any work, and
   are idempotent.** Providers retry; duplicate delivery must not double-fulfil.
3. **`payments` does not write order rows.** It records its own transaction log
   and reports events; `orders` decides what an event means for order status.

## Alternatives considered

**Integrate one provider directly and refactor later.** Faster initially.
Rejected: payment details leak into order logic quickly, and the refactor
happens under commercial pressure when the provider is already live. The
abstraction costs one interface now and is unlikely to be cheaper later.

**Wait for the business decision before building checkout.** Rejected: it blocks
the most valuable remaining work on an answer with no committed date.

**Adopt a multi-provider aggregator.** Rejected as speculative for a
single-market store, and the aggregators with the best coverage of Belarusian
methods are not obviously the ones with the best developer experience.

**Design for multiple simultaneous providers.** Rejected as speculative. The
interface permits it; nothing is built for it until a second provider exists.

## Reasons

- The decision is genuinely unmade and blocks nothing if abstracted.
- Provider-specific idiosyncrasies are precisely the kind of detail that should
  not reach `orders`, which already owns a complex state machine.
- A mock provider makes checkout testable end to end without network calls or
  credentials, which ADR-0008's strategy depends on.
- ERIP in particular has a flow unlike card redirects; the interface's
  `redirectUrl` plus webhook shape accommodates it without `orders` knowing.

## Consequences

- One indirection layer between `orders` and money movement, with the usual cost
  that a leaky provider concept can be hard to fit through a narrow interface.
- The interface will need at least one revision once a real provider is
  integrated. That is expected; the value is that the revision touches
  `payments` and `orders` only.
- Refunds, cancels, status reads, and status normalization now extend the
  interface (ADR-0022). Partial captures and settlement reporting are still
  out of scope.
- A mock provider that diverges from real provider behaviour can give false
  confidence in tests. Mitigated by treating the first real integration as a
  point where the mock is corrected to match.

## When to revisit

- A provider is chosen and integrated, and the interface proves to be the wrong
  shape — amend the interface, not the principle.
- The business commits permanently to exactly one provider **and** the
  abstraction is demonstrably obstructing work. Note that a single provider
  alone is not sufficient reason; the abstraction also buys testability.
- A second simultaneous provider or payment method is required, which the
  interface anticipates.
