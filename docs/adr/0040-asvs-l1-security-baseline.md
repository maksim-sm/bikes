# ADR-0040: ASVS 5.0 L1 as the current security bar

- Status: Accepted
- Date: 2026-09-13
- Amends: informal security rules in `docs/architecture.md` §14

## Context

Architecture §14 states the intended controls (parameterized SQL, dual
authorization, CSRF, httpOnly cookies, CSP at the edge, webhook signatures,
secret-free logs). Those bullets mixed implemented behaviour with deployment
intent. Prompt 23.1 asked for an OWASP ASVS 5.0 review of injection, XSS,
CSRF, authentication, authorization, sessions, access control, uploads,
secrets, logging, errors, payment callbacks, and admin endpoints.

ASVS 5.0.0 (May 2025) is organized in 17 chapters. This shop does not use
JWTs, OAuth, or WebRTC, so V9, V10, and V17 are out of scope. Card data is
never stored. A full L2/L3 assessment would require MFA, CSP, HSTS preload,
and a live payment provider that do not exist yet.

## Decision

1. **The current verification target is ASVS 5.0 Level 1**, recorded in
   `docs/security.md`. Every row maps to a `v5.0.0-*` identifier. L2 and L3
   rows are labelled, not treated as launch blockers.
2. **Code review is the method.** This ADR does not claim a certified ASVS
   assessment. Findings come from the modules, Route Handlers, server actions,
   and compose wiring as they stand.
3. **Architecture §14 remains the design intent.** Where the checklist marks a
   **Gap** or **Partial**, the architecture bullet is an aspiration until the
   code matches. The living record is the checklist, not a rewrite of every
   older ADR.
4. **Known L1 gaps stay explicit** until a later ADR closes them: mock payment
   compose, missing HSTS, JSON-LD script embedding, missing cookie name
   prefix, weak HTML-form rate keys, committed demo passwords, public payment
   GET.

## Alternatives considered

**Treat architecture §14 as already satisfied.** Rejected: CSP, checkout
throttling, and a production payment adapter are not in the repository.
Calling them done would hide the highest-risk compose finding.

**Target ASVS L2 now.** Rejected: L2 requires MFA (`v5.0.0-6.3.3`) and a CSP
with `object-src` / `base-uri`. Those are the next bar for staff and for a
live provider, not the current storefront.

**Fix every Gap in the same change as the review.** Rejected: the prompt is an
audit. Mixing silent hardening with the record would make the checklist
unverifiable.

## Consequences

- New auth, payment, upload, or admin work updates `docs/security.md` in the
  same change when it moves a row.
- A real `PaymentProvider` and Prisma payment repository in compose are the
  first close-out for the webhook rows.
- L2 work (MFA, CSP, `__Host-` cookies, distributed rate limits) gets its own
  ADR when it starts.

## When to revisit

- A payment provider that verifies a real signature is wired in production
  compose.
- The host or `next.config.ts` ships HSTS and CSP.
- Staff MFA or a second factor is required to enter `/admin`.
- ASVS itself publishes a 5.1+ numbering change that invalidates the IDs.
