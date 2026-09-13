# Logging and monitoring

Status: authoritative companion to ADR-0047 and `docs/architecture.md` §12.
Hosting is unresolved; there is no Datadog/Sentry subscription in this
repository. Diagnosis is JSON on stdout plus the admin ops surface.

## Structured logs

Every committed line goes through `src/lib/logger.ts`. Shape:

```json
{
  "level": "info",
  "message": "http.response",
  "time": "2026-09-13T12:00:00.000Z",
  "requestId": "…",
  "path": "/api/v1/checkout",
  "status": 200
}
```

`src/lib/redact.ts` replaces sensitive keys with `[redacted]` before
`JSON.stringify`. Matching is on the key name (password, secret, token,
cookie, authorization, session, apiKey, card, pan, cvv, cvc, payment
token, raw body).

**Never log:** passwords, session secrets, API keys, card PAN, CVV/CVC,
full payment tokens, raw webhook bodies, reset URLs.

## Request ID

`x-request-id` is accepted from the caller or minted (UUID). Middleware
echoes it on HTML and API responses. `withRoute` uses the same header
on the envelope. Thread it into `audit.record` and service logs.

Grep one checkout: `requestId=<id>`.

## Error tracking

`trackError` writes `error.tracked` (name, clipped message, requestId,
path). `withRoute` calls it on HTTP 500. `instrumentation.ts` installs
`uncaughtException` / `unhandledRejection` handlers (skipped under
Vitest). Replace the sink when a vendor is chosen; do not send card
data or secrets to that vendor either.

## Health checks

| Path          | Role      | 200                                   |
| ------------- | --------- | ------------------------------------- |
| `/api/health` | liveness  | Process up (including while draining) |
| `/api/ready`  | readiness | Postgres `SELECT 1` and not draining  |

See `docs/deploy.md`.

## Payment webhook monitoring

`POST /api/v1/payments/webhooks` never logs `rawBody` or signature
headers.

| Message                    | When                                  |
| -------------------------- | ------------------------------------- |
| `payment.webhook.applied`  | Verified event stored; status applied |
| `payment.webhook.replayed` | Idempotent duplicate                  |
| `payment.webhook.rejected` | Invalid signature or payload          |

Fields: `paymentId`, `status`, `providerEventId`, `rawType`, `reason`.
No PAN, no token, no payload JSON.

## Failed jobs / notifications

Channel failures are `FAILED` outbox rows (`docs/notifications.md`).
`notification.failed` logs `notificationId`, `event`, `entityType`,
`entityId` — not the recipient email.

Staff (`admin`) see the last 50 failed rows at `/admin/ops` and
`GET /api/v1/admin/ops`. The API omits email.

## Inventory anomalies

`inventory.listAnomalies` (inventory role / admin):

- `reserved_exceeds_on_hand`
- `negative_on_hand`
- `negative_reserved`
- `stale_active_reservation` (ACTIVE past `expiresAt`)

## Order-state anomalies

Pure check in `orders` domain, assembled in `loadOpsSnapshot`:

- `succeeded_payment_on_cancelled_order` — SUCCEEDED, no refund in flight
- `succeeded_payment_without_hold` — PLACED + SUCCEEDED + no ACTIVE reserve
- `shipped_without_success` — SHIPPED/DELIVERED without a settled success,
  except cash/card on delivery

## Admin

`/admin/ops` is admin-title only. It is visibility, not a worker.

## Related

- ADR-0047
- `docs/deploy.md` (health / ready)
- `docs/notifications.md`
- `docs/payments.md`
