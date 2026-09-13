# ADR-0042: In-process abuse controls

- Status: Accepted
- Date: 2026-09-13
- Amends: [ADR-0016](0016-customer-authentication.md), [ADR-0040](0040-asvs-l1-security-baseline.md)

## Context

Architecture §14 requires rate limits on authentication and checkout.
ADR-0016 already made `RateLimiter` a port, but the only consumer was
identity, HTML login/register/admin used a process-global static key, and
checkout, payment start, and webhooks had no limit at all.

The deployment is still one Next.js process and one PostgreSQL
(architecture §15). Redis is not installed and is not required at this
scale.

## Decision

1. **`src/lib/abuse` is the shared port.** `RateLimiter.consume(key, policy?)`
   and `assertAbuseLimit(action, identities)` are usable from identity,
   Route Handlers, and server actions. Identity re-exports the same type.
2. **The default backend is in-process memory** (`createMemoryRateLimiter`).
   A Redis adapter can implement the same port if a second instance or a
   measured shared-state need appears. We do not add Redis now.
3. **Policies are per action**, not one global bucket:
   - auth and admin login: 5 / 15 minutes;
   - checkout: 10 / 15 minutes;
   - payment start: 5 / 15 minutes;
   - webhooks: 60 / 15 minutes (signature remains the real gate).
4. **Keys are IP-based.** Server actions read `x-forwarded-for` the same
   way as `/api`. Auth also consumes a hashed-email key so a rotating IP
   cannot spray one mailbox. Static keys such as `"account-login"` are gone.
5. **HTTP 429 includes `Retry-After`** when the limiter supplies
   `retryAfterSec`.

## Alternatives considered

**Redis from day one.** Rejected: one process, no cache tier, and no
measured multi-instance deploy. ADR-0014 already rejected Redis for
inventory locking for the same reason.

**Keep the limiter inside `identity`.** Rejected: checkout and payments
must not depend on the auth module to throttle HTTP.

**Host/platform WAF only.** Rejected as the sole control: local, CI, and
self-hosted Node would have no limit. A WAF can sit in front later.

## Consequences

- HTML login, register, and admin login no longer share one global bucket.
- `POST /api/v1/payments` is the initiation surface the limiter can sit on.
  Compose still uses the mock provider.
- Multi-instance production must swap the memory adapter or accept
  per-process budgets.

## When to revisit

- A second application instance shares traffic.
- A live payment provider retries more aggressively than 60 / 15 minutes.
- Distributed (L2) limits are required for staff MFA / ASVS L2.
