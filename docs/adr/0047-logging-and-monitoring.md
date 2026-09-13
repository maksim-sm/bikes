# ADR-0047: Logging and monitoring

- Status: Accepted
- Date: 2026-09-13
- Amends: observability wording in `docs/architecture.md` §12

## Context

Architecture §12 required JSON logs, request ids, and a ban on secrets
in log lines. Health and ready existed (ADR-0046). Prompt 28.1 asked
to make production failures diagnosable: structured logs, request id,
error tracking, health, webhook monitoring, failed-job visibility,
inventory and order anomalies — without logging passwords, session
secrets, API keys, card data, CVV, or full payment tokens.

No APM vendor is chosen. A silent skip of diagnostics is worse than
stdout JSON.

## Decision

1. **`docs/observability.md` is the contract.**
2. **Logger redacts** context via `src/lib/redact.ts` before emit.
3. **Request ids** are minted or echoed in middleware and Route
   Handlers (`x-request-id`).
4. **Error tracking** is `error.tracked` plus process handlers. A
   vendor can wrap `trackError` later.
5. **Health / ready** stay as in ADR-0046.
6. **Webhooks** log applied / replayed / rejected with ids and status
   only — never the raw body.
7. **Failed outbox** is listed for admin (`/admin/ops`,
   `GET /api/v1/admin/ops`) and logged without recipient email.
8. **Anomalies** are deterministic domain checks (inventory counters
   and stale holds; paid-cancelled, paid-without-hold, unpaid shipment).

## Alternatives considered

**Ship Sentry now.** Rejected: hosting and DPA are unresolved; the sink
must stay swappable.

**Log full webhook bodies "for support".** Rejected: they are payment
tokens and PII.

**Show recipient emails on the ops API.** Rejected for the JSON
surface; staff already have order contact on `/admin/orders`.

## Consequences

- Admin nav gains Наблюдение.
- Audit sanitize keeps its own regex (domain cannot import `lib/`).
- False positives: a PLACED+SUCCEEDED order after an intentional
  release looks like `succeeded_payment_without_hold` until staff
  inspect it.

## When to revisit

- An error-tracking vendor is contracted.
- Log aggregation exists.
- Anomaly checks need a background sweep instead of on-demand.
