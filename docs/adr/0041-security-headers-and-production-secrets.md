# ADR-0041: Security headers and production secrets

- Status: Accepted
- Date: 2026-09-13
- Amends: [ADR-0016](0016-customer-authentication.md), [ADR-0040](0040-asvs-l1-security-baseline.md)

## Context

ADR-0040 recorded ASVS 5.0 L1 gaps: no HSTS, no CSP, no `nosniff` on HTML, no
Referrer-Policy, session cookies without a `__Host-` / `__Secure-` prefix, and
`lib/config.ts` supplying a default `DATABASE_URL` even in production. Prompt
23.2 asked to implement those controls and to fail production startup when
required secrets are missing. The CSP must not be relaxed for a third-party
widget.

`next build` sets `NODE_ENV=production`. Demanding live secrets at compile
time would break `pnpm check` and CI, which only need to compile.

## Decision

1. **`src/middleware.ts` sets the document policy.** Every HTML and API
   response (except `_next/static`) gets a per-request CSP nonce,
   `object-src 'none'`, `base-uri 'none'`, `frame-ancestors 'none'`, plus
   `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`,
   `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`
   (camera, geolocation, microphone, payment, and the other device APIs
   disabled), `Cross-Origin-Opener-Policy: same-origin`, and
   `Cross-Origin-Resource-Policy: same-origin`. `next.config.ts` repeats the
   static headers so files that skip middleware still send them.
2. **HTTPS is enforced only when `APP_URL` is https.** Production
   `next start` then 308-redirects `http` to `https` (except `/api/health`)
   and sends `Strict-Transport-Security: max-age=31536000; includeSubDomains`.
   `preload` is not set; that list is irreversible and is not appropriate yet.
3. **Secure cookies use the `__Host-` prefix.** When
   `usesSecureCookies()` is true, the session cookie is
   `__Host-bikes_session` and the guest cookie is `__Host-bikes_guest`
   (`Secure`, `Path=/`, no `Domain`). On http they keep the unprefixed names
   so browsers will store them.
4. **`AUTH_SECRET` signs guest-cart cookies** (HMAC-SHA-256). Production
   rejects unsigned guest cookies. Development still accepts a bare UUID so
   existing local and test cookies work.
5. **Production startup (`next start`) fails** unless `DATABASE_URL` is set,
   `APP_URL` is an `https://` origin, and `AUTH_SECRET` is at least 32
   characters. `NEXT_PHASE=phase-production-build` skips that check so
   `next build` can compile. `src/instrumentation.ts` imports config when the
   Node server starts.

The CSP `script-src` is `'self'`, a nonce, and `'strict-dynamic'`. No
third-party hosts. `'unsafe-eval'` is only for `next dev`. React `style={{}}`
attributes need `style-src-attr 'unsafe-inline'`; that is first-party, not a
widget exception.

## Alternatives considered

**Put a static CSP in `next.config.ts`.** Rejected: Next.js hydration scripts
need a per-request nonce. A global `'unsafe-inline'` would weaken the policy
the prompt forbids weakening.

**`__Secure-` instead of `__Host-`.** Weaker: it allows a `Domain` attribute.
`__Host-` matches how we already set `Path=/` and never set `Domain`.

**Require secrets during `next build`.** Rejected: CI and `pnpm check` would
need dummy production credentials just to typecheck.

**HSTS preload.** Rejected until the production hostname is stable and
https-only for all subdomains.

## Consequences

- Deployments must set `AUTH_SECRET`, `DATABASE_URL`, and an https `APP_URL`
  before `next start`. `pnpm env:check` under `NODE_ENV=production` is the
  same gate.
- Existing https sessions named `bikes_session` are ignored after deploy;
  users sign in again under `__Host-bikes_session`.
- A third-party chat or analytics script cannot be added by punching a hole
  in `script-src`. It needs its own ADR.

## When to revisit

- A real payment provider needs a callback on a second origin.
- The production hostname is ready for HSTS preload.
- Guest carts move to a signed cookie format that no longer accepts a bare
  UUID even in development.
