# Failure-mode contract

Status: authoritative companion to ADR-0048 and `docs/architecture.md` §13.
Every scenario below has one deterministic business outcome. Tests live next
to the module or in `tests/integration/failure-modes.test.ts`.

Providers are never live. Payment uses `PaymentProvider` (mock or a
timeout stub). Email uses `createFailingEmailChannel`. Object storage
uses a store that throws.

| Scenario                              | Deterministic outcome                                                                                  | Proof                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------- |
| Payment provider timeout              | `UnavailableError` (HTTP 503). No attempt row. Retry may start. Poll timeout leaves `CREATED`.         | `payments/application/failure-modes.test.ts` |
| Duplicate callback                    | Same `providerEventId` returns the stored attempt. One event row.                                      | unit + integration                           |
| Delayed callback                      | Webhook without `observeReturn` applies a legal status. After local `EXPIRED`, `SUCCEEDED` is ignored. | unit                                         |
| Database deadlock                     | `withDeadlockRetry` retries `P2034` / `40P01` / `40001`. Inventory insert and cart claim use it.       | `lib/db-retry.test.ts`, integration          |
| Email provider failure                | Outbox row is `FAILED`. Caller is not thrown. Order/payment already committed.                         | `notifications/application/services.test.ts` |
| Object storage failure                | Failed `put` leaves no asset. Failed metadata save deletes the object.                                 | `media/application/services.test.ts`         |
| Double-click checkout                 | `claimForCheckout` gives lines to one request. The other sees an empty cart (`validation_failed`).     | unit, HTTP, integration                      |
| Concurrent last bicycle               | One `PLACED` + one hold. The loser is `conflict`.                                                      | unit + integration                           |
| Payment succeeds after browser closes | Webhook alone moves the attempt to `SUCCEEDED`.                                                        | unit                                         |
| Payment succeeds, webhook delayed     | Same as delayed callback while still open. After expire, success is ignored (`EXPIRED` terminal).      | unit                                         |
| Cancellation during payment           | Order `CANCELLED`, hold released, open attempt `CANCELLED`. Late success webhook is ignored.           | unit + integration                           |
| Refund requested twice                | First `REFUNDED`. Second `ConflictError`. Provider idempotency key is unchanged.                       | unit + integration                           |

## Rules

1. A browser return URL never writes payment status (`docs/payments.md`).
2. `CANCELLED` and `EXPIRED` are terminal. Money captured after that window
   is an ops anomaly (`docs/observability.md`), not a silent revive.
3. Cart lines are claimed before reservation. A failed reserve restores the
   cart and marks the order `CANCELLED`.
4. Never log secrets or card data while asserting these paths.
