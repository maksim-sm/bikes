# ADR-0016: Customer authentication — Argon2id and hashed sessions

- Status: Accepted
- Date: 2026-09-12
- Settles: architecture §16 item 1 (Auth.js v4 vs v5)

## Context

Customers need registration, login, logout, password reset, and email
verification. Architecture §7 already requires memory-hard password hashes and
httpOnly `Secure` `SameSite=Lax` cookies. The remaining choice was the library.

Auth.js v4 is the older Pages-router API. Auth.js v5 was still a long-running
beta when this store was designed. Both want to own the session cookie and the
route tree, which fights `identity` owning credentials and Route Handlers
owning HTTP (ADR-0015).

## Decision

1. **Do not use Auth.js.** Session establishment stays in `identity`.
2. **Hash passwords with Argon2id** via `@node-rs/argon2`, using the OWASP
   parameters (m=19 MiB, t=2, p=1). Tests use a cheaper profile. We do not
   implement a KDF.
3. **Use the Lucia/Oslo session pattern:** a 32-byte CSPRNG token in an
   httpOnly cookie; only the SHA-256 digest is stored (`auth_sessions.token_hash`).
   The raw token is never returned in JSON and never logged.
4. **Email verification is required** before a customer may log in. Staff
   accounts are created verified. Mail is a port; the development adapter logs
   that mail was queued and never logs the token.
5. **Password reset** issues a hashed one-time token (1 hour). Completing a
   reset **revokes every session** for that user.
6. **Rate limiting is a port** (`RateLimiter.consume`). The default is an
   in-process window. A later Redis adapter can replace it without changing
   handlers.
7. **Account enumeration resistance:** register always returns
   `verificationRequired`; login failures share `invalid email or password`;
   password-reset and resend-verification always return `accepted`. A dummy
   Argon2 verify runs when the email is unknown so timing does not leak
   existence.
8. **Security events** go through `lib/logger` (`auth.login.success`,
   `auth.login.failure`, `auth.logout`, `auth.password_reset.*`,
   `auth.email_verified`, `auth.session_revoked`, `auth.register`). Tokens and
   passwords are never in the payload.

Cookie flags: `HttpOnly`, `SameSite=Lax`, `Path=/`, `Secure` in production or
when `APP_URL` is https. Cookie name: `bikes_session`.

Unsafe methods on `/api/v1` check `Origin` against `APP_URL` (except payment
webhooks).

## Alternatives considered

**Auth.js Credentials + JWT.** Rejected: JWTs in cookies are readable by
anything that can get the cookie value into JS if flags slip, and Auth.js
owns routes we already specified.

**Auth.js database sessions.** Closer, but still couples `identity` to Auth.js
tables and callbacks.

**bcrypt.** Rejected: not memory-hard.

**Rolling our own hash or HMAC cookie.** Rejected: “do not invent cryptography.”
Argon2id and SHA-256 of a CSPRNG token are standard library / maintained
bindings of published algorithms.

## Reasons

- Identity remains the only module that understands credentials.
- The cookie is not available to `document.cookie`.
- The stored digest is useless if the database leaks without the cookie value.
- A mailer port lets us require verification before an email vendor exists.

## Consequences

- Prisma gained `auth_sessions` and `auth_tokens`.
- Development bearer tokens from ADR-0015 are gone.
- An email provider adapter must replace `createLoggingMailer` before
  production mail is real; until then tokens are only available to tests
  through the capturing mailer.

## When to revisit

- A second factor or WebAuthn is required.
- Session theft requires binding to user-agent or step-up on new device.
- Auth.js ships a stable App Router API that does **not** take cookie
  ownership away from `identity`.

Wanting a social login button is not a trigger; add a provider port first.
